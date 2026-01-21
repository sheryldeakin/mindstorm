import Button from "../ui/Button";

/**
 * Props for DataDeletionFlows (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface DataDeletionFlowsProps {
  onRequestDeletion: () => void;
  onConfirmDeletion: () => void;
}

const DataDeletionFlows = ({ onRequestDeletion, onConfirmDeletion }: DataDeletionFlowsProps) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
    <h3 className="text-lg font-semibold text-rose-700">Delete your data</h3>
    <p className="mt-1 text-sm text-rose-600">
      This will remove journal entries, insights, and exports. This action cannot be undone.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button variant="secondary" onClick={onRequestDeletion}>
        Review what gets deleted
      </Button>
      <Button onClick={onConfirmDeletion} className="bg-rose-600 text-white hover:bg-rose-700">
        Delete everything
      </Button>
    </div>
  </div>
);

export default DataDeletionFlows;
