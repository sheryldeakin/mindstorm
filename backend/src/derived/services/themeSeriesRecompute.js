const EntrySignals = require("../models/EntrySignals");
const ThemeSeries = require("../models/ThemeSeries");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");
const path = require("path");
const patientView = require(path.join(
  __dirname,
  "../../../../packages/criteria-graph/criteria_specs/v1/depressive_disorders_patient_view.json"
));

const MAX_ALL_TIME_DAYS = 730;
const DEFAULT_INTENSITY = 0.4;

/**
 * Maps severity labels to numeric intensity.
 * @param {string} severity
 * @returns {number}
 */
const severityToIntensity = (severity) => {
  if (!severity) return DEFAULT_INTENSITY;
  const normalized = String(severity).trim().toUpperCase();
  if (normalized === "SEVERE") return 1.0;
  if (normalized === "MODERATE") return 0.7;
  if (normalized === "MILD") return 0.4;
  return DEFAULT_INTENSITY;
};

/**
 * Maps evidence labels to patient-facing theme labels.
 * @param {string} label
 * @returns {string}
 */
const buildPatientLabelMap = () => {
  const map = new Map();
  const evidenceMappings = patientView?.evidence_label_mappings || {};
  Object.entries(evidenceMappings).forEach(([code, entry]) => {
    if (entry?.patient_label) {
      map.set(code, entry.patient_label);
    }
  });
  const nodeMappings = patientView?.node_mappings || {};
  const symptomMappings = nodeMappings?.symptoms || {};
  Object.entries(symptomMappings).forEach(([code, value]) => {
    if (value?.patient_label) {
      map.set(code, value.patient_label);
    }
  });
  const impactMappings = nodeMappings?.impact_domains || {};
  Object.entries(impactMappings).forEach(([code, value]) => {
    if (value?.patient_label) {
      map.set(code, value.patient_label);
    }
  });
  return map;
};

const patientLabelMap = buildPatientLabelMap();

const mapLabelToTheme = (label) => {
  const overrides = {
    SYMPTOM_MOOD: "Low mood",
    SYMPTOM_ANHEDONIA: "Reduced enjoyment",
    SYMPTOM_ANXIETY: "Anxiety",
    SYMPTOM_SLEEP: "Sleep changes",
    SYMPTOM_SOMATIC: "Body/energy changes",
    SYMPTOM_COGNITIVE: "Self-critical thoughts",
    SYMPTOM_MANIA: "High energy shifts",
    SYMPTOM_PSYCHOSIS: "Unusual perceptions",
    SYMPTOM_TRAUMA: "Trauma responses",
    IMPAIRMENT: "Life impact",
  };
  if (overrides[label]) return overrides[label];
  if (patientLabelMap.has(label)) return patientLabelMap.get(label);
  return String(label || "")
    .replace(/^(SYMPTOM_|IMPACT_|CONTEXT_|IMPAIRMENT_)/, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
};

/**
 * Filters evidence units eligible for theme series.
 * @param {{ label?: string, attributes?: { polarity?: string }, polarity?: string }} unit
 * @returns {boolean}
 */
const shouldIncludeUnit = (unit) => {
  const label = unit?.label;
  if (!label) return false;
  if (!label.startsWith("SYMPTOM_") && !label.startsWith("IMPACT_")) return false;
  const polarity = unit?.attributes?.polarity || unit?.polarity;
  return polarity === "PRESENT";
};

/**
 * Returns the dateISO lower bound for a range key.
 * @param {string} rangeKey
 * @returns {string | null}
 */
const getRangeStartIso = (rangeKey) => {
  if (rangeKey === "all_time") return null;
  const days =
    rangeKey === "last_365_days"
      ? 365
      : rangeKey === "last_90_days"
        ? 90
        : rangeKey === "last_7_days"
          ? 7
          : 30;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return start.toISOString().slice(0, 10);
};

/**
 * Builds an inclusive dateISO list between start and end.
 * @param {string} startIso
 * @param {string} endIso
 * @returns {string[]}
 */
const buildDateList = (startIso, endIso) => {
  const dates = [];
  if (!startIso || !endIso) return dates;
  const [startYear, startMonth, startDay] = startIso.split("-").map((value) => Number(value));
  const [endYear, endMonth, endDay] = endIso.split("-").map((value) => Number(value));
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  for (let date = start; date <= end; date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
};

/**
 * Resolves the date window for a given range key and signals.
 * @param {string} rangeKey
 * @param {Array<{ dateISO?: string }>} signals
 * @returns {Promise<string[]>}
 */
const getRangeDates = async (rangeKey, signals) => {
  const endIso = new Date().toISOString().slice(0, 10);
  if (rangeKey !== "all_time") {
    const startIso = getRangeStartIso(rangeKey);
    return buildDateList(startIso, endIso);
  }

  const earliestIso = signals.length ? signals[0].dateISO : null;
  if (!earliestIso) return [];

  const [year, month, day] = earliestIso.split("-").map((value) => Number(value));
  const earliestDate = new Date(year, month - 1, day);
  const capStart = new Date();
  capStart.setDate(capStart.getDate() - (MAX_ALL_TIME_DAYS - 1));
  const startDate = earliestDate < capStart ? capStart : earliestDate;
  if (earliestDate < capStart) {
    console.warn("[theme-series] all_time range capped", {
      earliestIso,
      capStart: capStart.toISOString().slice(0, 10),
      maxDays: MAX_ALL_TIME_DAYS,
    });
  }
  const startIso = startDate.toISOString().slice(0, 10);
  return buildDateList(startIso, endIso);
};

/**
 * Recompute per-theme time series for a user and range key.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, rangeKey: string }} params
 * @returns {Promise<void>}
 */
const recomputeThemeSeriesForUser = async ({ userId, rangeKey }) => {
  const startIso = getRangeStartIso(rangeKey);
  const query = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const signals = await EntrySignals.find(query).sort({ dateISO: 1 }).lean();
  const dates = await getRangeDates(rangeKey, signals);

  if (!dates.length) {
    await ThemeSeries.deleteMany({ userId, rangeKey });
    return;
  }

  const dayThemeMap = new Map();
  const themeTotals = new Map();
  const themeCounts = new Map();

  signals.forEach((signal) => {
    if (!signal.dateISO) return;
    if (!dayThemeMap.has(signal.dateISO)) {
      dayThemeMap.set(signal.dateISO, new Map());
    }
    const themeMap = dayThemeMap.get(signal.dateISO);

    const evidenceUnits = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    if (evidenceUnits.length) {
      evidenceUnits.forEach((unit) => {
        if (!shouldIncludeUnit(unit)) return;
        const theme = mapLabelToTheme(unit.label);
        if (!theme) return;
        const key = theme.trim().toLowerCase();
        if (!key) return;
        const intensity = severityToIntensity(unit?.attributes?.severity || unit?.severity);
        const prev = themeMap.get(key) || { intensity: 0, confidence: 0.6 };
        const nextIntensity = Math.max(prev.intensity, intensity);
        const confidence = Math.max(prev.confidence, 0.7);
        themeMap.set(key, { intensity: nextIntensity, confidence });
      });
    } else {
      const themeIntensities = Array.isArray(signal.themeIntensities) && signal.themeIntensities.length
        ? signal.themeIntensities
        : [];

      if (themeIntensities.length) {
        themeIntensities.forEach((item) => {
          if (!item?.theme) return;
          const key = item.theme.trim().toLowerCase();
          if (!key) return;
          const prev = themeMap.get(key) || { intensity: 0, confidence: 0.6 };
          const intensity = Math.min(1, prev.intensity + (Number(item.intensity) || 0));
          const confidence = Math.max(prev.confidence, 0.7);
          themeMap.set(key, { intensity, confidence });
        });
      } else if (Array.isArray(signal.themes)) {
        signal.themes.forEach((theme) => {
          const key = theme.trim().toLowerCase();
          if (!key) return;
          const prev = themeMap.get(key) || { intensity: 0, confidence: 0.6 };
          const intensity = Math.min(1, prev.intensity + 1);
          const confidence = Math.max(prev.confidence, 0.6);
          themeMap.set(key, { intensity, confidence });
        });
      }
    }
  });

  dayThemeMap.forEach((themes) => {
    themes.forEach((value, theme) => {
      themeTotals.set(theme, (themeTotals.get(theme) || 0) + value.intensity);
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    });
  });

  const topThemes = Array.from(themeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([theme]) => theme);

  const selectedThemes = new Set(topThemes);
  themeCounts.forEach((count, theme) => {
    if (count >= 3) {
      selectedThemes.add(theme);
    }
  });

  if (!selectedThemes.size && themeTotals.size) {
    selectedThemes.add(topThemes[0]);
  }

  const sourceVersion = await computeSourceVersionForRange(userId, rangeKey);
  const now = new Date();

  const ops = Array.from(selectedThemes).map((theme) => {
    const points = dates.map((dateISO) => {
      const themeMap = dayThemeMap.get(dateISO);
      const value = themeMap?.get(theme);
      const intensity = value?.intensity || 0;
      const confidence = intensity > 0 ? value?.confidence || 0.6 : 0.2;
      return { dateISO, intensity, confidence };
    });

    return {
      updateOne: {
        filter: { userId, rangeKey, theme },
        update: {
          $set: {
            userId,
            rangeKey,
            theme,
            points,
            computedAt: now,
            pipelineVersion: PIPELINE_VERSION.themeSeries,
            sourceVersion,
            stale: false,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length) {
    await ThemeSeries.bulkWrite(ops, { ordered: false });
  }

  if (selectedThemes.size) {
    await ThemeSeries.deleteMany({ userId, rangeKey, theme: { $nin: Array.from(selectedThemes) } });
  }
};

/**
 * Recompute all theme series marked stale.
 * @returns {Promise<void>}
 */
const recomputeStaleThemeSeries = async () => {
  const stale = await ThemeSeries.find({ stale: true }).lean();
  const userRangePairs = new Map();
  stale.forEach((doc) => {
    userRangePairs.set(`${doc.userId}:${doc.rangeKey}`, { userId: doc.userId, rangeKey: doc.rangeKey });
  });

  for (const pair of userRangePairs.values()) {
    await recomputeThemeSeriesForUser(pair);
  }
};

module.exports = { recomputeThemeSeriesForUser, recomputeStaleThemeSeries, getRangeStartIso };
