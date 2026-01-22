export interface CheckInMetric {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
}

export interface CheckInStoredMetric {
  id: string;
  label: string;
  value: number;
}

export interface CheckInRecord {
  dateISO: string;
  metrics: CheckInStoredMetric[];
  tags?: string[];
  note?: string;
}
