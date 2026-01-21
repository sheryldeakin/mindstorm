import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Textarea from "../ui/Textarea";

type StatusValue = "MET" | "EXCLUDED" | "UNKNOWN";

type StatusDecisionMenuProps = {
  autoStatus: StatusValue;
  overrideStatus?: StatusValue | null;
  onUpdate: (status: StatusValue | null, note?: string) => void;
};

const labelForStatus = (status: StatusValue, isOverride: boolean) => {
  if (isOverride) {
    if (status === "MET") return "Clinician: Verified";
    if (status === "EXCLUDED") return "Clinician: Rejected";
    return "Clinician: Needs inquiry";
  }
  if (status === "MET") return "AI: Evidence found";
  if (status === "EXCLUDED") return "AI: Evidence denied";
  return "AI: Not detected";
};

const chipClass = (status: StatusValue, isOverride: boolean) => {
  if (isOverride) {
    if (status === "MET") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "EXCLUDED") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (status === "MET") return "bg-sky-50 text-sky-700 border-sky-200 border-dashed";
  if (status === "EXCLUDED") return "bg-slate-100 text-slate-600 border-slate-300 border-dashed";
  return "bg-slate-50 text-slate-500 border-slate-200 border-dashed";
};

const StatusDecisionMenu = ({ autoStatus, overrideStatus, onUpdate }: StatusDecisionMenuProps) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const effectiveStatus = overrideStatus || autoStatus;
  const isOverride = Boolean(overrideStatus);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const handleUpdate = (status: StatusValue | null) => {
    onUpdate(status, note.trim() ? note.trim() : undefined);
    setOpen(false);
    setNote("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "rounded-full border px-3 py-1 text-[11px] font-semibold",
          chipClass(effectiveStatus, isOverride),
        )}
      >
        {labelForStatus(effectiveStatus, isOverride)}
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Clinical judgment
          </p>
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleUpdate("MET")}
              className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-emerald-700 hover:bg-emerald-100"
            >
              Confirm (Met)
            </button>
            <button
              type="button"
              onClick={() => handleUpdate("EXCLUDED")}
              className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2 text-rose-700 hover:bg-rose-100"
            >
              Reject (Unmet)
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleUpdate("UNKNOWN")}
            className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            Mark as unknown
          </button>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add clinical note..."
            className="mt-3 text-xs"
            rows={3}
          />
          {isOverride ? (
            <button
              type="button"
              onClick={() => handleUpdate(null)}
              className="mt-3 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Revert to system analysis
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default StatusDecisionMenu;
