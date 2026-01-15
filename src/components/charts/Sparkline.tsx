import { useId } from "react";

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  variant?: "up" | "down" | "steady";
  showPoints?: boolean;
  smooth?: boolean;
  showArea?: boolean;
};

const normalizeData = (data: number[]) => {
  if (data.length >= 2) {
    return data;
  }
  if (data.length === 1) {
    return [data[0], data[0]];
  }
  return [0, 0];
};

const buildPoints = (data: number[], width: number, height: number, padding: number) => {
  const safeData = normalizeData(data);
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;
  const step = (width - padding * 2) / (safeData.length - 1);

  return safeData.map((value, index) => {
    const x = padding + index * step;
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return { x, y };
  });
};

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) {
    return "";
  }
  return points.reduce((path, point, index, arr) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const prev = arr[index - 1];
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    return `${path} Q ${prev.x} ${prev.y} ${midX} ${midY} T ${point.x} ${point.y}`;
  }, "");
};

const buildLinePath = (points: { x: number; y: number }[]) =>
  points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

const Sparkline = ({
  data,
  width = 220,
  height = 56,
  variant = "steady",
  showPoints = true,
  smooth = true,
  showArea = true,
}: SparklineProps) => {
  const gradientId = useId();
  const stroke =
    variant === "up" ? "var(--spark-up)" : variant === "down" ? "var(--spark-down)" : "var(--spark-steady)";
  const padding = 6;
  const points = buildPoints(data, width, height, padding);
  const linePath = smooth ? buildSmoothPath(points) : buildLinePath(points);
  const baseline = height - padding;
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding} ${baseline} L ${points[0]?.x ?? padding} ${baseline} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label="Trend sparkline">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {showArea ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {showPoints &&
        points.map((point, index) => {
          const isLast = index === points.length - 1;
          return (
            <circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r={isLast ? 3.6 : 2.6}
              fill="rgba(255, 255, 255, 0.85)"
              stroke={stroke}
              strokeWidth={isLast ? 1.3 : 1}
              opacity={isLast ? 0.95 : 0.75}
            />
          );
        })}
    </svg>
  );
};

export default Sparkline;
