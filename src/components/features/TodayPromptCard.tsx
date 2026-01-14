interface TodayPromptCardProps {
  prompts: string[];
}

const TodayPromptCard = ({ prompts }: TodayPromptCardProps) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
    <h3 className="text-lg font-semibold text-slate-700">Gentle prompts</h3>
    <p className="mt-1 text-sm text-slate-500">Small nudges to reflect on today.</p>
    <div className="mt-4 space-y-3">
      {prompts.map((prompt) => (
        <div key={prompt} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {prompt}
        </div>
      ))}
    </div>
  </div>
);

export default TodayPromptCard;
