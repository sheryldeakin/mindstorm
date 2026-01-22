import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../lib/apiClient";
import useDiagnosticLogic, { type DiagnosticStatus } from "../hooks/useDiagnosticLogic";
import { appendComputedEvidenceToEntries } from "@mindstorm/criteria-graph";
import useSessionDelta from "../hooks/useSessionDelta";
import type { CaseEntry, ClinicianNote, ClinicianOverrideRecord } from "../types/clinician";

type ClinicalCaseValue = {
  caseId: string;
  userName: string;
  entries: CaseEntry[];
  notes: ClinicianNote[];
  overrideRecords: ClinicianOverrideRecord[];
  nodeOverrides: Record<string, DiagnosticStatus>;
  loading: boolean;
  error: string | null;
  graphLogic: ReturnType<typeof useDiagnosticLogic>;
  sessionDelta: ReturnType<typeof useSessionDelta>;
  refresh: () => Promise<void>;
  saveOverride: (
    nodeId: string,
    status: DiagnosticStatus | null,
    meta?: { originalStatus?: DiagnosticStatus; originalEvidence?: string; note?: string },
  ) => Promise<void>;
  saveNote: (payload: { title: string; body: string }) => Promise<void>;
  updateNote: (noteId: string, payload: { title: string; body: string }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
};

const ClinicalCaseContext = createContext<ClinicalCaseValue | undefined>(undefined);

const buildOverrideMap = (records: ClinicianOverrideRecord[]) =>
  records.reduce<Record<string, DiagnosticStatus>>((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});

export const ClinicalCaseProvider = ({
  caseId,
  children,
}: {
  caseId: string;
  children: ReactNode;
}) => {
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [userName, setUserName] = useState("");
  const [notes, setNotes] = useState<ClinicianNote[]>([]);
  const [overrideRecords, setOverrideRecords] = useState<ClinicianOverrideRecord[]>([]);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, DiagnosticStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionDelta = useSessionDelta(caseId);

  const graphLogic = useDiagnosticLogic(entries, { overrides: nodeOverrides, patientId: caseId });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [entryResponse, overrideResponse, notesResponse] = await Promise.all([
        apiFetch<{ user: { name: string }; entries: CaseEntry[] }>(`/clinician/cases/${caseId}/entries`),
        apiFetch<{ overrides: ClinicianOverrideRecord[] }>(`/clinician/cases/${caseId}/overrides`),
        apiFetch<{ notes: ClinicianNote[] }>(`/clinician/cases/${caseId}/notes`),
      ]);
      setEntries(appendComputedEvidenceToEntries(entryResponse.entries || []));
      setUserName(entryResponse.user?.name || "Patient");
      setNotes(notesResponse.notes || []);
      setOverrideRecords(overrideResponse.overrides || []);
      setNodeOverrides(buildOverrideMap(overrideResponse.overrides || []));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load case.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveOverride = useCallback(
    async (
      nodeId: string,
      status: DiagnosticStatus | null,
      meta?: { originalStatus?: DiagnosticStatus; originalEvidence?: string; note?: string },
    ) => {
      if (!status) {
        setNodeOverrides((prev) => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
        setOverrideRecords((prev) => prev.filter((item) => item.nodeId !== nodeId));
        try {
          await apiFetch(`/clinician/cases/${caseId}/overrides/${nodeId}`, { method: "DELETE" });
        } catch {
          // Revert locally if the delete fails.
          setNodeOverrides((prev) => ({ ...prev, [nodeId]: meta?.originalStatus || "UNKNOWN" }));
        }
        return;
      }
      const originalStatus = meta?.originalStatus || "UNKNOWN";
      const optimisticRecord: ClinicianOverrideRecord = {
        id: `optimistic-${nodeId}`,
        nodeId,
        status,
        originalStatus,
        originalEvidence: meta?.originalEvidence || "",
        note: meta?.note || "",
        updatedAt: new Date().toISOString(),
      };
      setNodeOverrides((prev) => ({ ...prev, [nodeId]: status }));
      setOverrideRecords((prev) => {
        const next = prev.filter((item) => item.nodeId !== nodeId);
        return [optimisticRecord, ...next];
      });
      try {
        const response = await apiFetch<{ override: ClinicianOverrideRecord }>(
          `/clinician/cases/${caseId}/overrides`,
          {
            method: "POST",
            body: JSON.stringify({
              nodeId,
              status,
              originalStatus,
              originalEvidence: meta?.originalEvidence || "",
              note: meta?.note || "",
            }),
          },
        );
        if (response.override) {
          setOverrideRecords((prev) => {
            const next = prev.filter((item) => item.nodeId !== response.override.nodeId);
            return [response.override, ...next];
          });
        }
      } catch {
        setNodeOverrides((prev) => {
          const next = { ...prev };
          if (originalStatus) {
            next[nodeId] = originalStatus;
          } else {
            delete next[nodeId];
          }
          return next;
        });
        setOverrideRecords((prev) => prev.filter((item) => item.nodeId !== nodeId));
      }
    },
    [caseId],
  );

  const saveNote = useCallback(
    async (payload: { title: string; body: string }) => {
      const response = await apiFetch<{ note: ClinicianNote }>(`/clinician/cases/${caseId}/notes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (response.note) {
        setNotes((prev) => [response.note, ...prev]);
      }
    },
    [caseId],
  );

  const updateNote = useCallback(
    async (noteId: string, payload: { title: string; body: string }) => {
      const response = await apiFetch<{ note: ClinicianNote }>(
        `/clinician/cases/${caseId}/notes/${noteId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      if (response.note) {
        setNotes((prev) => prev.map((note) => (note.id === noteId ? response.note : note)));
      }
    },
    [caseId],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      await apiFetch(`/clinician/cases/${caseId}/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    },
    [caseId],
  );

  const value = useMemo<ClinicalCaseValue>(
    () => ({
      caseId,
      userName,
      entries,
      notes,
      overrideRecords,
      nodeOverrides,
      loading,
      error,
      graphLogic,
      sessionDelta,
      refresh,
      saveOverride,
      saveNote,
      updateNote,
      deleteNote,
    }),
    [
      caseId,
      userName,
      entries,
      notes,
      overrideRecords,
      nodeOverrides,
      loading,
      error,
      graphLogic,
      sessionDelta,
      refresh,
      saveOverride,
      saveNote,
      updateNote,
      deleteNote,
    ],
  );

  return <ClinicalCaseContext.Provider value={value}>{children}</ClinicalCaseContext.Provider>;
};

export const useClinicalCase = () => {
  const ctx = useContext(ClinicalCaseContext);
  if (!ctx) throw new Error("useClinicalCase must be used within a ClinicalCaseProvider");
  return ctx;
};
