import type { HTMLAttributes } from "react";
import clsx from "clsx";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      "ms-card ms-elev-2 ms-card-hover",
      className,
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("p-6 pb-0", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("p-6 pt-4", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("p-6 pt-0", className)} {...props} />
);
