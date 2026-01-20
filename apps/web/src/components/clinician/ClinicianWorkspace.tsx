import { useState } from "react";
import Tabs from "../ui/Tabs";

type ClinicianWorkspaceProps = {
  triage: React.ReactNode;
  draft: React.ReactNode;
  notes: React.ReactNode;
};

const ClinicianWorkspace = ({ triage, draft, notes }: ClinicianWorkspaceProps) => {
  const [activeId, setActiveId] = useState("triage");
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Clinician workspace</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Action inbox</h3>
        </div>
        <Tabs
          options={[
            { id: "triage", label: "Triage" },
            { id: "draft", label: "Draft" },
            { id: "notes", label: "Private" },
          ]}
          activeId={activeId}
          onValueChange={setActiveId}
        />
      </div>
      <div className="mt-4">
        {activeId === "triage" ? triage : null}
        {activeId === "draft" ? draft : null}
        {activeId === "notes" ? notes : null}
      </div>
    </div>
  );
};

export default ClinicianWorkspace;
