import type { JournalEntry } from "../../types/journal";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";

interface EntryCardProps {
  entry: JournalEntry;
}

const EntryCard = ({ entry }: EntryCardProps) => (
  <Card className="border-slate-100 p-6 text-slate-900 shadow-sm">
    <div className="flex items-center justify-between text-sm text-brand/60">
      <span>{entry.date}</span>
      <span>{entry.tags.join(" / ")}</span>
    </div>
    <h3 className="mt-4 text-xl font-semibold text-brand">{entry.title}</h3>
    <p className="mt-2 text-sm text-slate-600">{entry.summary}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {entry.emotions.map((emotion) => (
        <Badge key={emotion.label} tone={emotion.tone}>
          {emotion.label} - {emotion.intensity}%
        </Badge>
      ))}
    </div>
  </Card>
);

export default EntryCard;
