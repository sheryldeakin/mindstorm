import { useMemo, useState } from "react";
import type { ClinicianNote } from "../../types/clinician";

type ClinicianNotesPanelProps = {
  notes: ClinicianNote[];
  onCreate: (payload: { title: string; body: string }) => Promise<void>;
  onUpdate: (noteId: string, payload: { title: string; body: string }) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  auditItems: { label: string; detail: string; dateISO: string }[];
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const ClinicianNotesPanel = ({ notes, onCreate, onUpdate, onDelete, auditItems }: ClinicianNotesPanelProps) => {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

  const handleCreate = async () => {
    if (!draftTitle.trim() || !draftBody.trim()) return;
    setSaving(true);
    await onCreate({ title: draftTitle.trim(), body: draftBody.trim() });
    setDraftTitle("");
    setDraftBody("");
    setSaving(false);
  };

  const startEdit = (note: ClinicianNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  };

  const handleSave = async (noteId: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    await onUpdate(noteId, { title: editTitle.trim(), body: editBody.trim() });
    setEditingId(null);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Note title"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            placeholder="Add clinician note…"
            className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || !draftTitle.trim() || !draftBody.trim()}
            className="self-start rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      </div>

      {auditItems.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">Override audit</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-500">
            {auditItems.map((item) => (
              <li key={`${item.label}-${item.dateISO}`} className="flex items-center justify-between gap-3">
                <span>{item.label}</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.dateISO}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sortedNotes.length === 0 ? (
        <p className="text-sm text-slate-500">No clinician notes yet.</p>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {formatDate(note.createdAt)}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-slate-800">{note.title}</h4>
                </div>
                {editingId !== note.id ? (
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {editingId === note.id ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(note.id)}
                      disabled={saving}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(note.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{note.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClinicianNotesPanel;
