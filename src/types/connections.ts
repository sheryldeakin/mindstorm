export interface ConnectionNode {
  id: string;
  label: string;
}

export interface ConnectionEvidence {
  id: string;
  quote: string;
  source: string;
}

export interface ConnectionEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  strength: number;
  evidence: ConnectionEvidence[];
}
