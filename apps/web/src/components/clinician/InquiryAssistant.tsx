import type { DiagnosticStatus } from "../../hooks/useDiagnosticLogic";

type InquiryItem = {
  id: string;
  text: string;
};

/**
 * Props for InquiryAssistant (Clinician-Facing).
 * Clinical precision required; supports override decisions.
 */
type InquiryAssistantProps = {
  items: InquiryItem[];
  onOverride: (nodeId: string, status: DiagnosticStatus) => void;
};

const InquiryAssistant = ({ items, onOverride }: InquiryAssistantProps) => {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No outstanding clarification prompts.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
        >
          <p>{item.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onOverride(item.id, "MET")}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700"
            >
              Mark as met
            </button>
            <button
              type="button"
              onClick={() => onOverride(item.id, "EXCLUDED")}
              className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-700"
            >
              Mark as unmet
            </button>
            <button
              type="button"
              disabled
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-400"
              title="Coming soon"
            >
              Send to patient
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InquiryAssistant;
export type { InquiryItem };
