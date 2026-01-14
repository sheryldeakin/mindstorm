import type { PatientSummarySection } from "../../types/prepare";

interface PDFPreviewProps {
  sections: PatientSummarySection[];
  redactedTopics: string[];
  redactedQuotes: string[];
}

const PDFPreview = ({ sections, redactedTopics, redactedQuotes }: PDFPreviewProps) => {
  const visibleSections = sections.filter(
    (section) => !section.topics.some((topic) => redactedTopics.includes(topic)),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">Patient-facing summary preview</p>
      <div className="mt-4 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-700">{section.title}</h4>
            <p className="mt-2 text-xs text-slate-600">{section.content}</p>
            {section.quotes.length > 0 && (
              <div className="mt-3 space-y-2 text-xs text-slate-500">
                {section.quotes
                  .filter((quote) => !redactedQuotes.includes(quote.id))
                  .map((quote) => (
                    <p key={quote.id}>“{quote.text}”</p>
                  ))}
              </div>
            )}
          </div>
        ))}
        {!visibleSections.length && (
          <p className="text-xs text-slate-500">All sections are currently hidden by redaction.</p>
        )}
      </div>
    </div>
  );
};

export default PDFPreview;
