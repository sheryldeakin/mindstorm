/**
 * Props for MiniTrendSparkLine (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface MiniTrendSparkLineProps {
  values: number[];
}

const MiniTrendSparkLine = ({ values }: MiniTrendSparkLineProps) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 120;
      const y = 32 - ((value - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-8 w-32" viewBox="0 0 120 32">
      <polyline
        fill="none"
        stroke="rgba(14,116,144,0.8)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export default MiniTrendSparkLine;
