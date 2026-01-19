import Button from "../ui/Button";

interface SettingsSaveBarProps {
  isDirty: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSave: () => void;
  onDiscard: () => void;
}

const SettingsSaveBar = ({ isDirty, isSaving = false, error, onSave, onDiscard }: SettingsSaveBarProps) => {
  if (!isDirty) return null;

  return (
    <div className="sticky bottom-6 z-30 mt-6 rounded-2xl border border-brand/15 bg-white/90 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Unsaved changes</p>
          <p className="text-xs text-slate-500">
            Review your edits before leaving this page.
          </p>
          {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDiscard} disabled={isSaving}>
            Discard
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSaveBar;
