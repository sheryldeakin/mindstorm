import type { CopingStrategies } from "../../types/patterns";
import { Card } from "../ui/Card";

/**
 * Props for CopingStrategiesPanel (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface CopingStrategiesPanelProps {
  strategies: CopingStrategies;
}

const CopingStrategiesPanel = ({ strategies }: CopingStrategiesPanelProps) => (
  <Card className="p-6 text-slate-900">
    <h3 className="text-xl font-semibold">What helps</h3>
    <p className="mt-1 text-sm text-slate-500">Your tags plus model-suggested supports.</p>
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-sm font-semibold text-slate-700">User-tagged</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {strategies.userTagged.map((strategy) => (
            <span key={strategy} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              {strategy}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Model-suggested</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {strategies.suggested.map((strategy) => (
            <span key={strategy} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
              {strategy}
            </span>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

export default CopingStrategiesPanel;
