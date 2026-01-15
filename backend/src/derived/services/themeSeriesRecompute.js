const EntrySignals = require("../models/EntrySignals");
const ThemeSeries = require("../models/ThemeSeries");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");

const MAX_ALL_TIME_DAYS = 730;

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
