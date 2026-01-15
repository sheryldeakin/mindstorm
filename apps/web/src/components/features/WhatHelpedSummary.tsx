interface WhatHelpedSummaryProps {
  highlights: string[];
}

const WhatHelpedSummary = ({ highlights }: WhatHelpedSummaryProps) => (
  <div className="ms-card ms-elev-2 rounded-3xl p-6">
    <h3 className="text-xl font-semibold">What helped</h3>
    <p className="mt-1 text-sm text-slate-500">Supports that softened the week.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {highlights.map((item) => (
        <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
          {item}
        </span>
      ))}
    </div>
  </div>
);

export default WhatHelpedSummary;
