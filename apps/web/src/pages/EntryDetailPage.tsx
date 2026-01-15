import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EntrySummaryPanel from "../components/features/EntrySummaryPanel";
import ThemeIntensitySummary from "../components/features/ThemeIntensitySummary";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import useEntry from "../hooks/useEntry";

const EntryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useEntry(id);

  const formattedEntryDate = useMemo(() => {
    if (!data?.dateISO && !data?.createdAt) return "";
    const value = data.dateISO || data.createdAt || "";
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [data?.createdAt, data?.dateISO]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
        Loading entry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error || "Entry not found."}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-2 border p-8 text-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Entry summary</p>
            <h2 className="mt-2 text-3xl font-semibold">{data.title || "Untitled reflection"}</h2>
            <p className="mt-2 text-sm text-slate-500">{formattedEntryDate}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/patient/entry/${data.id}/edit`)}>
            Edit entry
          </Button>
        </div>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Reflection</h3>
            <p className="mt-2 text-sm text-slate-600">{data.summary}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Theme intensity</h3>
            <div className="mt-3">
              <ThemeIntensitySummary themes={data.themeIntensities} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Tags and themes</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.tags?.length ? (
                data.tags.map((tag) => (
                  <Badge key={tag} className="bg-slate-100 text-slate-700">
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No tags yet.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Emotions logged</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.emotions?.length ? (
                data.emotions.map((emotion) => (
                  <Badge key={emotion.label} tone={emotion.tone}>
                    {emotion.label} · {emotion.intensity}%
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No emotions logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </Card>
      <EntrySummaryPanel entry={data} />
    </div>
  );
};

export default EntryDetailPage;
