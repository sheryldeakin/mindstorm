import { Link } from "react-router-dom";
import type { JournalEntry } from "../../types/journal";
import { Card } from "../ui/Card";
import Button from "../ui/Button";
import { buildContextImpactTags, buildSignalPreview } from "../../lib/patientSignals";
import Badge from "../ui/Badge";

/**
 * Props for EntryCard (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface EntryCardProps {
  entry: JournalEntry;
}

const EntryCard = ({ entry }: EntryCardProps) => (
  <Card className="p-6 text-slate-900">
    <div className="flex items-center justify-between text-sm text-brand/60">
      <span>{entry.date}</span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {buildContextImpactTags(entry).length ? (
          buildContextImpactTags(entry).map((tag) => (
            <Badge key={tag} className="bg-slate-100 text-slate-600">
              {tag}
            </Badge>
          ))
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
    <h3 className="mt-4 text-xl font-semibold text-brand">{entry.title}</h3>
    <p className="mt-2 text-sm text-slate-600">{buildSignalPreview(entry)}</p>
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
