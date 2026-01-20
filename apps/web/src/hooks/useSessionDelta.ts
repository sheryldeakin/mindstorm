import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

type SessionDelta = {
  lastAccessISO: string | null;
  markReviewed: () => void;
};

const buildStorageKey = (clinicianId: string, patientId: string) =>
  `mindstorm:clinician:lastAccess:${clinicianId}:${patientId}`;

const useSessionDelta = (patientId?: string | null): SessionDelta => {
  const { user } = useAuth();
  const [lastAccessISO, setLastAccessISO] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !patientId) return;
    const key = buildStorageKey(user.id, patientId);
    const stored = localStorage.getItem(key);
    setLastAccessISO(stored);
    const now = new Date().toISOString();
    localStorage.setItem(key, now);
  }, [patientId, user?.id]);

  const markReviewed = useMemo(
    () => () => {
      if (!user?.id || !patientId) return;
      const now = new Date().toISOString();
      setLastAccessISO(now);
      localStorage.setItem(buildStorageKey(user.id, patientId), now);
    },
    [patientId, user?.id],
  );

  return { lastAccessISO, markReviewed };
};

export default useSessionDelta;
