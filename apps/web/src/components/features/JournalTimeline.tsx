import { useNavigate } from "react-router-dom";
import type { JournalEntry } from "../../types/journal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { buildContextImpactTags, buildSignalPreview } from "../../lib/patientSignals";

/**
 * Props for JournalTimeline (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface JournalTimelineProps {
  entries: JournalEntry[];
  loading?: boolean;
}

const JournalTimeline = ({ entries, loading = false }: JournalTimelineProps) => {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="flex flex-wrap gap-4 pb-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="ms-card ms-elev-2 w-full animate-pulse rounded-3xl p-4 text-sm text-brand/70 sm:w-[220px]"
          >
            <div className="h-3 w-24 rounded-full bg-brand/10" />
            <div className="mt-3 h-4 w-32 rounded-full bg-brand/10" />
            <div className="mt-2 h-3 w-20 rounded-full bg-brand/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="ms-card ms-elev-2 rounded-3xl p-4 text-sm text-slate-600">
        No entries yet. Log your first reflection to see your timeline here.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 pb-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="ms-card ms-elev-2 w-full rounded-3xl p-4 text-sm text-brand/70 sm:w-[220px]"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-brand/50">{entry.date}</p>
          <p className="mt-3 font-semibold text-brand">{entry.title}</p>
          <p className="mt-2 text-slate-500">{buildSignalPreview(entry)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {buildContextImpactTags(entry).length ? (
              buildContextImpactTags(entry).map((tag) => (
                <Badge key={tag} className="bg-slate-100 text-slate-600">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/patient/entry/${entry.id}`)}
            >
              Open entry
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JournalTimeline;
