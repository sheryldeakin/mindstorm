import { FileText, ArrowRight, Activity, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";

/**
 * VISUALIZES THE "CONTRIBUTION":
 * Shows the transformation of raw patient text into structured clinical signals.
 */
const EvidenceTranslationCard = ({
  entryCount,
  signalCount,
}: {
  entryCount: number;
  signalCount: number;
}) => {
  return (
    <Card className="p-0 overflow-hidden border-indigo-100 bg-gradient-to-br from-white to-slate-50">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            System Contribution
          </span>
        </div>
        <div className="text-xs text-slate-400">AI-Assisted Structuring</div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-6">
        {/* LEFT: RAW INPUT */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText size={16} className="text-slate-400" />
            Unstructured Narrative
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs italic leading-relaxed text-slate-500 shadow-sm">
            "I've been feeling empty for weeks, waking up at 3am... can't focus on work."
          </div>
          <div className="pl-1 text-[10px] font-medium text-slate-400">
            {entryCount} Journal Entries Processed
          </div>
        </div>

        {/* CENTER: PROCESS */}
        <div className="flex flex-col items-center justify-center gap-1 text-indigo-300">
          <div className="h-px w-8 bg-indigo-200" />
          <ArrowRight size={16} />
          <div className="h-px w-8 bg-indigo-200" />
        </div>

        {/* RIGHT: STRUCTURED OUTPUT */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity size={16} className="text-indigo-500" />
            Structured Evidence
          </div>
          <div className="space-y-1.5 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-mono text-indigo-700">
                SYMPTOM_MOOD [Present]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-700">
                DURATION_2W [Met]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-mono text-amber-700">
                IMPACT_WORK [Moderate]
              </span>
            </div>
          </div>
          <div className="pl-1 text-[10px] font-medium text-indigo-600">
            {signalCount} Clinical Signals Extracted
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EvidenceTranslationCard;
