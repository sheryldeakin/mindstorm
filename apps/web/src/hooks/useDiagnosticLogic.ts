import { useEffect, useMemo, useState } from "react";
import {
  evaluateDiagnosticLogic,
  type DiagnosticLogicOptions as BaseDiagnosticLogicOptions,
  type DiagnosticLogicState,
  type DiagnosticStatus,
} from "@mindstorm/criteria-graph";
import type { CaseEntry } from "../types/clinician";
import { apiFetch } from "../lib/apiClient";

type DiagnosticLogicOptions = BaseDiagnosticLogicOptions & {
  patientId?: string;
  useServer?: boolean;
};

type ClinicalStatusResponse = {
  currentSymptoms?: string[];
  currentDenials?: string[];
  lifetimeSymptoms?: string[];
  lifetimeDenials?: string[];
  currentCount?: number;
  lifetimeCount?: number;
  lifetimeWindowMax?: number;
  potentialRemission?: boolean;
};

const normalizeOverrides = (
  overrides?: Record<string, DiagnosticStatus>,
  overrideList?: Array<{ nodeId: string; status: DiagnosticStatus }>,
) => {
  if (overrides) return overrides;
  if (!overrideList?.length) return undefined;
  return overrideList.reduce<Record<string, DiagnosticStatus>>((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});
};

const buildStatusChecker =
  (
    symptoms: Set<string>,
    denials: Set<string>,
    overrides?: Record<string, DiagnosticStatus>,
  ) =>
  (labels?: string[]) => {
    if (!labels?.length) return "UNKNOWN";
    if (overrides) {
      const override = labels
        .map((label) => overrides[label])
        .find((status) => status && status !== "UNKNOWN");
      if (override) return override;
    }
    if (labels.some((label) => symptoms.has(label))) return "MET";
    if (labels.some((label) => denials.has(label))) return "EXCLUDED";
    return "UNKNOWN";
  };

const useDiagnosticLogic = (
  entries: CaseEntry[],
  options: DiagnosticLogicOptions = {},
): DiagnosticLogicState => {
  const {
    windowDays,
    diagnosticWindowDays,
    threshold,
    overrides,
    overrideList,
    rejectedEvidenceKeys,
    patientId,
    useServer = true,
  } = options;
  const [serverStatus, setServerStatus] = useState<ClinicalStatusResponse | null>(null);
  const localOverrides = normalizeOverrides(overrides, overrideList);

  useEffect(() => {
    if (!patientId || !useServer) {
      setServerStatus(null);
      return;
    }
    let active = true;
    const params = new URLSearchParams();
    if (windowDays) params.set("windowDays", String(windowDays));
    if (diagnosticWindowDays) params.set("diagnosticWindowDays", String(diagnosticWindowDays));
    if (threshold) params.set("threshold", String(threshold));
    const query = params.toString();

    apiFetch<ClinicalStatusResponse>(`/derived/clinical-status/${patientId}${query ? `?${query}` : ""}`)
      .then((response) => {
        if (!active) return;
        setServerStatus(response || null);
      })
      .catch(() => {
        if (!active) return;
        setServerStatus(null);
      });

    return () => {
      active = false;
    };
  }, [patientId, useServer, windowDays, diagnosticWindowDays, threshold]);

  const baseLogic = useMemo(
    () => evaluateDiagnosticLogic(entries, options),
    [entries, windowDays, diagnosticWindowDays, threshold, overrides, overrideList, rejectedEvidenceKeys],
  );

  const serverLogic = useMemo(() => {
    if (!serverStatus) return null;
    const currentSymptoms = new Set(serverStatus.currentSymptoms || []);
    const currentDenials = new Set(serverStatus.currentDenials || []);
    const lifetimeSymptoms = new Set(serverStatus.lifetimeSymptoms || []);
    const lifetimeDenials = new Set(serverStatus.lifetimeDenials || []);
    const getStatusForLabels = buildStatusChecker(
      currentSymptoms,
      currentDenials,
      localOverrides,
    );

    return {
      currentSymptoms,
      currentDenials,
      lifetimeSymptoms,
      lifetimeDenials,
      currentCount: serverStatus.currentCount ?? baseLogic.currentCount,
      lifetimeCount: serverStatus.lifetimeCount ?? baseLogic.lifetimeCount,
      lifetimeWindowMax: serverStatus.lifetimeWindowMax ?? baseLogic.lifetimeWindowMax,
      potentialRemission: serverStatus.potentialRemission ?? baseLogic.potentialRemission,
      getStatusForLabels,
    };
  }, [serverStatus, baseLogic, localOverrides]);

  return {
    ...baseLogic,
    ...(serverLogic || {}),
    getStatusForLabels: serverLogic?.getStatusForLabels || baseLogic.getStatusForLabels,
  };
};

export type { DiagnosticStatus };

export default useDiagnosticLogic;
