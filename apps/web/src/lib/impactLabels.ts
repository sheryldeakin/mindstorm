const WORK_PATTERNS = [
  /\bwork\b/i,
  /\bjob\b/i,
  /\bshift\b/i,
  /\bboss\b/i,
  /\bmanager\b/i,
  /\boffice\b/i,
  /\bcoworker\b/i,
  /\bmeeting\b/i,
  /\bdeadline\b/i,
  /\bclient\b/i,
  /\bproject\b/i,
  /\bworkplace\b/i,
];

const SCHOOL_PATTERNS = [
  /\bschool\b/i,
  /\bclass\b/i,
  /\bclasses\b/i,
  /\bhomework\b/i,
  /\bassignment\b/i,
  /\bexam\b/i,
  /\btest\b/i,
  /\bgrade\b/i,
  /\blecture\b/i,
  /\blab\b/i,
  /\bcampus\b/i,
  /\bprofessor\b/i,
  /\bteacher\b/i,
  /\bcollege\b/i,
  /\buniversity\b/i,
  /\bsemester\b/i,
  /\bfinals\b/i,
  /\bstud(y|ies|ying)\b/i,
];

export const inferWorkSchoolBucket = (text?: string | null) => {
  if (!text) return null;
  const sample = String(text);
  const workCount = WORK_PATTERNS.filter((pattern) => pattern.test(sample)).length;
  const schoolCount = SCHOOL_PATTERNS.filter((pattern) => pattern.test(sample)).length;
  if (workCount && !schoolCount) return "work";
  if (schoolCount && !workCount) return "school";
  if (workCount && schoolCount) {
    if (workCount > schoolCount) return "work";
    if (schoolCount > workCount) return "school";
  }
  return null;
};

export const resolveImpactWorkLabel = (
  text: string | null | undefined,
  labels: { work: string; school: string; fallback: string },
) => {
  const bucket = inferWorkSchoolBucket(text);
  if (bucket === "work") return labels.work;
  if (bucket === "school") return labels.school;
  return labels.fallback;
};

export const resolveImpactWorkLabelFromUnits = <T extends { span?: string | null }>(
  units: T[] | null | undefined,
  labels: { work: string; school: string; fallback: string },
) => {
  if (!units || !units.length) return labels.fallback;
  let workCount = 0;
  let schoolCount = 0;
  units.forEach((unit) => {
    const bucket = inferWorkSchoolBucket(unit.span || "");
    if (bucket === "work") workCount += 1;
    if (bucket === "school") schoolCount += 1;
  });
  if (workCount && !schoolCount) return labels.work;
  if (schoolCount && !workCount) return labels.school;
  if (workCount && schoolCount) {
    if (workCount > schoolCount) return labels.work;
    if (schoolCount > workCount) return labels.school;
  }
  return labels.fallback;
};
