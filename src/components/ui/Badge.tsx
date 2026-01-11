import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "positive" | "negative";
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-brand/10 text-brand",
  positive: "bg-emerald-50 text-emerald-600",
  negative: "bg-rose-50 text-rose-600",
};

const Badge = ({ className, tone = "neutral", ...props }: BadgeProps) => (
  <span
    className={clsx(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide",
      toneStyles[tone],
      className,
    )}
    {...props}
  />
);

export default Badge;
