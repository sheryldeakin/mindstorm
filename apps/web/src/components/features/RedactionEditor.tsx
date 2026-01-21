/**
 * Props for RedactionEditor (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface RedactionEditorProps {
  topics: string[];
  redactedTopics: string[];
  quotes: { id: string; text: string }[];
  redactedQuotes: string[];
  onToggleTopic: (topic: string) => void;
  onToggleQuote: (quoteId: string) => void;
}

const RedactionEditor = ({
  topics,
  redactedTopics,
  quotes,
  redactedQuotes,
  onToggleTopic,
  onToggleQuote,
}: RedactionEditorProps) => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-semibold text-slate-700">Remove topics</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isRedacted = redactedTopics.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onToggleTopic(topic)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isRedacted
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand/30"
              }`}
            >
              {isRedacted ? "Hidden" : "Visible"} · {topic}
            </button>
          );
        })}
      </div>
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-700">Redact quotes</p>
      <div className="mt-3 space-y-2">
        {quotes.map((quote) => {
          const isRedacted = redactedQuotes.includes(quote.id);
          return (
            <button
              key={quote.id}
              type="button"
              onClick={() => onToggleQuote(quote.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-xs transition ${
                isRedacted
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand/30"
              }`}
            >
              {isRedacted ? "Redacted" : "Visible"} · “{quote.text}”
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default RedactionEditor;
