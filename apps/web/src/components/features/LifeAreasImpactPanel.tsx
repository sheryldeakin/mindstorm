import type { LifeAreaImpact } from "../../types/patterns";
import { Card } from "../ui/Card";

interface LifeAreasImpactPanelProps {
  areas: LifeAreaImpact[];
}

const LifeAreasImpactPanel = ({ areas }: LifeAreasImpactPanelProps) => (
  <Card className="p-6 text-slate-900">
    <h3 className="text-xl font-semibold">Where it shows up</h3>
    <p className="mt-1 text-sm text-slate-500">Life areas with the strongest signal.</p>
    <div className="mt-6 space-y-4">
      {areas.map((area) => (
        <div key={area.id} className="ms-glass-surface rounded-2xl border p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{area.label}</span>
            <span className="text-slate-500">{area.score}%</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{area.detail}</p>
          <div className="mt-3 h-2 rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
              style={{ width: `${area.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default LifeAreasImpactPanel;
