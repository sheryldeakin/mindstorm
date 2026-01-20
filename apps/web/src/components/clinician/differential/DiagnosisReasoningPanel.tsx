import { Card } from "../../ui/Card";
import type { DifferentialDiagnosis } from "./types";
import type { CaseEntry } from "../../../types/clinician";
import type { DepressiveDiagnosisKey } from "../../../lib/depressiveCriteriaConfig";
import CriteriaChecklist from "./CriteriaChecklist";
import SymptomCourse from "./SymptomCourse";
import FunctionalImpact from "./FunctionalImpact";
import ExclusionChecks from "./ExclusionChecks";
import ClarificationPrompts from "./ClarificationPrompts";
import ReasoningGraphAccordion from "./ReasoningGraphAccordion";
import Specifiers from "./Specifiers";

type DiagnosisReasoningPanelProps = {
  diagnosis: DifferentialDiagnosis;
  diagnosisKey: DepressiveDiagnosisKey;
  entries: CaseEntry[];
  nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  onOverrideChange?: (nodeId: string, status: "MET" | "EXCLUDED" | "UNKNOWN" | null) => void;
  lastAccessISO?: string | null;
};

const DiagnosisReasoningPanel = ({
  diagnosis,
  diagnosisKey,
  entries,
  nodeOverrides,
  onOverrideChange,
  lastAccessISO,
}: DiagnosisReasoningPanelProps) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Criteria sufficiency</h3>
        <p className="mt-1 text-sm text-slate-500">
          Evidence signals mapped to core criteria.
        </p>
        <div className="mt-4">
          <CriteriaChecklist items={diagnosis.criteria} summary={diagnosis.criteriaSummary} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Symptom course</h3>
        <p className="mt-1 text-sm text-slate-500">
          Recent trajectory for key signals.
        </p>
        <div className="mt-4">
          <SymptomCourse rows={diagnosis.symptomCourse} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Functional impact</h3>
        <p className="mt-1 text-sm text-slate-500">Evidence of impact across life domains.</p>
        <div className="mt-4">
          <FunctionalImpact domains={diagnosis.functionalImpact} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Exclusion & differential checks</h3>
        <p className="mt-1 text-sm text-slate-500">
          Context factors and exclusionary gates.
        </p>
        <div className="mt-4">
          <ExclusionChecks checks={diagnosis.exclusionChecks} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">To further evaluate…</h3>
        <p className="mt-1 text-sm text-slate-500">Open questions based on missing data.</p>
        <div className="mt-4">
          <ClarificationPrompts prompts={diagnosis.prompts} />
        </div>
      </Card>

      <ReasoningGraphAccordion
        diagnosisKey={diagnosisKey}
        entries={entries}
        nodeOverrides={nodeOverrides}
        onOverrideChange={onOverrideChange}
        lastAccessISO={lastAccessISO}
      />

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Active specifier patterns</h3>
        <div className="mt-4">
          <Specifiers specifiers={diagnosis.specifiers} />
        </div>
      </Card>
    </div>
  );
};

export default DiagnosisReasoningPanel;
