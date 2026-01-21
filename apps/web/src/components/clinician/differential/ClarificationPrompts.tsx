import type { ClarificationPrompt } from "./types";

/**
 * Props for ClarificationPrompts (Clinician-Facing).
 * Clinical precision required; lists diagnostic clarification prompts.
 */
type ClarificationPromptsProps = {
  prompts: ClarificationPrompt[];
};

const ClarificationPrompts = ({ prompts }: ClarificationPromptsProps) => {
  return (
    <ul className="space-y-2 text-sm text-slate-600">
      {prompts.map((prompt, index) => (
        <li key={`${prompt.text}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">
            {prompt.category || "clarification"}
          </span>
          <span className="text-sm text-slate-700">{prompt.text}</span>
        </li>
      ))}
    </ul>
  );
};

export default ClarificationPrompts;
