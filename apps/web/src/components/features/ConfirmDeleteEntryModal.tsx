import Button from "../ui/Button";
import { Card } from "../ui/Card";

/**
 * Props for ConfirmDeleteEntryModal (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface ConfirmDeleteEntryModalProps {
  isOpen: boolean;
  entryTitle?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmDeleteEntryModal = ({
  isOpen,
  entryTitle,
  onCancel,
  onConfirm,
  loading = false,
}: ConfirmDeleteEntryModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <Card
        className="w-full max-w-lg border-rose-200 bg-white p-6 text-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-rose-500">Delete entry</p>
            <h3 className="mt-2 text-2xl font-semibold">Are you sure?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {entryTitle ? `“${entryTitle}” will be removed permanently.` : "This entry will be removed permanently."}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-rose-600 text-white hover:bg-rose-700"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete entry"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmDeleteEntryModal;
