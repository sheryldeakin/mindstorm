import type { HTMLAttributes } from "react";
import clsx from "clsx";

/** Shared UI: tab selector used in patient and clinician flows. */
interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: { id: string; label: string }[];
  activeId: string;
  onValueChange?: (value: string) => void;
}

/** Shared UI: internal tab button props. */
interface TabProps {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}

const Tab = ({ label, isActive, onSelect }: TabProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={clsx(
      "ms-tab rounded-full px-4 py-1.5 text-sm transition",
      isActive ? "ms-tab-active" : "text-slate-600 hover:text-brand",
    )}
  >
    {label}
  </button>
);

const Tabs = ({ options, activeId, className, onValueChange, ...props }: TabsProps) => {
  const handleSelect = (value: string) => {
    onValueChange?.(value);
  };

  return (
    <div
      className={clsx(
        "ms-card ms-elev-1 inline-flex items-center gap-2 rounded-full border border-slate-900/5 bg-white/60 p-1 backdrop-blur",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <Tab key={option.id} label={option.label} isActive={option.id === activeId} onSelect={() => handleSelect(option.id)} />
      ))}
    </div>
  );
};

export default Tabs;
