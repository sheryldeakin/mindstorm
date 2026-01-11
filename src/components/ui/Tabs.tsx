import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: { id: string; label: string }[];
  activeId: string;
  onValueChange?: (value: string) => void;
}

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
      "rounded-full px-4 py-1.5 text-sm transition",
      isActive ? "bg-white text-brand shadow-lg shadow-brandLight/40" : "text-slate-500 hover:text-brand",
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
        "inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 p-1",
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
