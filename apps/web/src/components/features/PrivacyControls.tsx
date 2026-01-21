import Button from "../ui/Button";

/**
 * Props for PrivacyControls (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface PrivacyControlsProps {
  onExportData: () => void;
  onDeleteData: () => void;
}

const PrivacyControls = ({ onExportData, onDeleteData }: PrivacyControlsProps) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="text-lg font-semibold text-slate-700">Privacy controls</h3>
    <p className="mt-1 text-sm text-slate-500">
      Manage your data, exports, and what MindStorm keeps.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button variant="secondary" onClick={onExportData}>
        Export data
      </Button>
      <Button variant="ghost" onClick={onDeleteData} className="text-rose-600 hover:text-rose-700">
        Delete data
      </Button>
    </div>
  </div>
);

export default PrivacyControls;
