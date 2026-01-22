import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [localOverride, setLocalOverride] = useState<StatusValue | null | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayOverride = localOverride !== undefined ? localOverride : overrideStatus ?? null;
  const effectiveStatus = displayOverride || autoStatus;
  const isOverride = Boolean(displayOverride);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const menuWidth = 256;

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const nextTop = rect.bottom + 8;
    const preferredLeft = rect.right - menuWidth;
    const clampedLeft = Math.max(8, Math.min(preferredLeft, window.innerWidth - menuWidth - 8));
    setMenuPosition({ top: nextTop, left: clampedLeft });
  };

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    const handleOutside = (event: MouseEvent) => {
      if (
        !wrapperRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleScroll = () => updateMenuPosition();
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  useEffect(() => {
    if (localOverride !== undefined) {
      setLocalOverride(undefined);
    }
  }, [overrideStatus]);

  const handleUpdate = (status: StatusValue | null) => {
    const nextNote = note.trim() ? note.trim() : undefined;
    setLocalOverride(status);
    setOpen(false);
    setNote("");
    setTimeout(() => {
      onUpdate(status, nextNote);
    }, 0);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        ref={buttonRef}
        className={clsx(
          "rounded-full border px-3 py-1 text-[11px] font-semibold",
          chipClass(effectiveStatus, isOverride),
        )}
      >
        {labelForStatus(effectiveStatus, isOverride)}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-50 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default StatusDecisionMenu;
