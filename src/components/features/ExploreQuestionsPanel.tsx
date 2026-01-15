import { Card } from "../ui/Card";

interface ExploreQuestionsPanelProps {
  questions: string[];
}

const ExploreQuestionsPanel = ({ questions }: ExploreQuestionsPanelProps) => (
  <Card className="p-6 text-slate-900">
    <h3 className="text-xl font-semibold">Questions to explore</h3>
    <p className="mt-1 text-sm text-slate-500">Coach-like prompts to guide your next reflection.</p>
    <div className="mt-6 space-y-3">
      {questions.map((question) => (
        <div key={question} className="ms-glass-surface flex items-start gap-3 rounded-2xl border p-4">
          <span className="mt-0.5 h-2 w-2 rounded-full bg-brand" />
          <p className="text-sm text-slate-700">{question}</p>
        </div>
      ))}
    </div>
  </Card>
);

export default ExploreQuestionsPanel;
