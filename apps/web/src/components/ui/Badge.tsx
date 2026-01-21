import type { HTMLAttributes } from "react";
import clsx from "clsx";

/** Shared UI: badge styling used in patient- and clinician-facing surfaces. */
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "positive" | "negative";
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "ms-badge ms-badge-neutral",
  positive: "ms-badge ms-badge-positive",
  negative: "ms-badge ms-badge-negative",
};

const Badge = ({ className, tone = "neutral", ...props }: BadgeProps) => (
  <span
    className={clsx(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
      toneStyles[tone],
      className,
    )}
    {...props}
  />
);

export default Badge;
