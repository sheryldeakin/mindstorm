import clsx from "clsx";
import type { SpecifierTag } from "./types";

/**
 * Props for Specifiers (Clinician-Facing).
 * Clinical precision required; displays specifier ranges.
 */
type SpecifiersProps = {
  specifiers: SpecifierTag[];
};

const Specifiers = ({ specifiers }: SpecifiersProps) => {
  if (!specifiers.length) {
    return <p className="text-sm text-slate-500">No specifier patterns observed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {specifiers.map((specifier) => (
        <span
          key={`${specifier.label}-${specifier.startISO}`}
          className={clsx(
            "rounded-full px-3 py-1 text-xs",
            specifier.active
              ? "bg-indigo-100 text-indigo-700 font-semibold"
              : "border border-slate-200 text-slate-500",
          )}
        >
          {specifier.label} ({specifier.startISO} – {specifier.endISO})
        </span>
      ))}
    </div>
  );
};

export default Specifiers;
