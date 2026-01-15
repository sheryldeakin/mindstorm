import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

const Chip = ({ className, active, ...props }: ChipProps) => (
  <span
    className={clsx(
      "inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-[11px] font-medium transition",
      active
        ? "ms-badge ms-badge-active"
        : "ms-badge ms-badge-neutral text-slate-600 hover:text-brand",
      className,
    )}
    {...props}
  />
);

export default Chip;
