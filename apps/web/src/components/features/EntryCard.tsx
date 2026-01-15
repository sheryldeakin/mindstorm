import { Link } from "react-router-dom";
import type { JournalEntry } from "../../types/journal";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface EntryCardProps {
  entry: JournalEntry;
}

const EntryCard = ({ entry }: EntryCardProps) => (
  <Card className="p-6 text-slate-900">
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
    <div className="mt-6 flex justify-end">
      <Link to={`/patient/entry/${entry.id}`}>
        <Button variant="secondary" size="sm">
          Open entry
        </Button>
      </Link>
    </div>
  </Card>
);

export default EntryCard;
