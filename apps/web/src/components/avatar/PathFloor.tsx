import type { FC } from "react";

type PathFloorProps = {
  activeDomain: "root" | "context" | "symptom" | "impact";
};

const getOpacity = (activeDomain: PathFloorProps["activeDomain"], domain: PathFloorProps["activeDomain"]) =>
  activeDomain === "root" || activeDomain === domain ? 0.35 : 0.1;

const getColor = (domain: PathFloorProps["activeDomain"]) => {
  if (domain === "context") return "#94a3b8";
  if (domain === "symptom") return "#818cf8";
  if (domain === "impact") return "#fb923c";
  return "#e2e8f0";
};

export const PathFloor: FC<PathFloorProps> = ({ activeDomain }) => {
  const pathLength = 10;
  const pathWidth = 1.2;
  const centerRadius = 1.2;

  return (
    <group position={[0, 0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[centerRadius, 64]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={1} />
      </mesh>

      <group rotation={[0, -0.6, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -pathLength / 2]}>
          <planeGeometry args={[pathWidth, pathLength]} />
          <meshBasicMaterial
            color={getColor("impact")}
            transparent
            opacity={getOpacity(activeDomain, "impact")}
          />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -pathLength / 2]}>
        <planeGeometry args={[pathWidth, pathLength + 2]} />
        <meshBasicMaterial
          color={getColor("symptom")}
          transparent
          opacity={getOpacity(activeDomain, "symptom")}
        />
      </mesh>

      <group rotation={[0, 0.6, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -pathLength / 2]}>
          <planeGeometry args={[pathWidth, pathLength]} />
          <meshBasicMaterial
            color={getColor("context")}
            transparent
            opacity={getOpacity(activeDomain, "context")}
          />
        </mesh>
      </group>
    </group>
  );
};
