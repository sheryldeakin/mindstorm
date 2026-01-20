import { useMemo } from "react";
import type { CaseEntry } from "../../types/clinician";
import { getMddIcdPreview } from "../../lib/icdCoding";
import { Card } from "../ui/Card";

type ICDCodeGeneratorProps = {
  entries: CaseEntry[];
};

const ICDCodeGenerator = ({ entries }: ICDCodeGeneratorProps) => {
  const preview = useMemo(() => getMddIcdPreview(entries), [entries]);

  return (
    <Card className="border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ICD-10 coding assistant</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {preview.code}
        </span>
        <span className="text-sm font-semibold text-slate-700">{preview.label}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{preview.detail}</p>
    </Card>
  );
};

export default ICDCodeGenerator;
