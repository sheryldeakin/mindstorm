import type { HTMLAttributes } from "react";
import clsx from "clsx";

/** Shared UI: card container for patient and clinician layouts. */
type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: CardProps) => (
  <div
    className={clsx(
      "ms-card ms-elev-2 ms-card-hover",
      className,
    )}
    {...props}
  />
);

/** Shared UI: card header wrapper. */
export const CardHeader = ({ className, ...props }: CardProps) => (
  <div className={clsx("p-6 pb-0", className)} {...props} />
);

/** Shared UI: card body wrapper. */
export const CardContent = ({ className, ...props }: CardProps) => (
  <div className={clsx("p-6 pt-4", className)} {...props} />
);

/** Shared UI: card footer wrapper. */
export const CardFooter = ({ className, ...props }: CardProps) => (
  <div className={clsx("p-6 pt-0", className)} {...props} />
);
