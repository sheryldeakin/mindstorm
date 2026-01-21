import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

/** Shared UI: input field used in patient and clinician experiences. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:border-brandLight focus:outline-none focus:ring-2 focus:ring-brandLight/20",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export default Input;
