import clsx from "clsx";
import type { ReactNode } from "react";
import { pageHeaders } from "../../config/pageHeaders";

type PageHeaderProps = {
  pageId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  layout?: "split" | "stacked";
  titleClassName?: string;
  eyebrowClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
};

const PageHeader = ({
  pageId,
  eyebrow,
  title,
  description,
  actions,
  className,
  bodyClassName,
  layout = "split",
  titleClassName,
  eyebrowClassName,
  descriptionClassName,
  children,
}: PageHeaderProps) => {
  const config = pageId ? pageHeaders[pageId] : undefined;
  const resolvedEyebrow = eyebrow ?? config?.eyebrow;
  const resolvedTitle = title ?? config?.title;
  const resolvedDescription = description ?? config?.description;

  return (
    <section className={clsx("space-y-6", config?.className, className)}>
      {layout === "split" ? (
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            {resolvedEyebrow ? (
              <p className={clsx("small-label text-brandLight", eyebrowClassName)}>{resolvedEyebrow}</p>
            ) : null}
            {resolvedTitle ? (
              <h2 className={clsx("mt-2 text-3xl font-semibold", titleClassName)}>{resolvedTitle}</h2>
            ) : null}
            {resolvedDescription ? (
              <p className={clsx("mt-2 max-w-2xl text-sm text-slate-500", descriptionClassName)}>
                {resolvedDescription}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : (
        <div>
          {resolvedEyebrow ? (
            <p className={clsx("small-label text-brandLight", eyebrowClassName)}>{resolvedEyebrow}</p>
          ) : null}
          {resolvedTitle ? (
            <h2 className={clsx("mt-2 text-3xl font-semibold", titleClassName)}>{resolvedTitle}</h2>
          ) : null}
          {resolvedDescription ? (
            <p className={clsx("mt-2 max-w-2xl text-sm text-slate-500", descriptionClassName)}>
              {resolvedDescription}
            </p>
          ) : null}
          {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      )}
      {children ? <div className={clsx(bodyClassName)}>{children}</div> : null}
    </section>
  );
};

export default PageHeader;
