import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";
import { ConstellationTotem, ImpactTotem, SymptomTotem } from "./DataMonumentsLab";
import type { ConnectionEdge, ConnectionNode } from "../../types/connections";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { JournalEntry } from "../../types/journal";

type JourneyState = "root" | "context" | "symptom" | "impact";

const ZONES: Record<JourneyState, { cam: [number, number, number]; look: [number, number, number] }> = {
  root: { cam: [0, 1.6, 4.5], look: [0, 0.9, 0] },
  context: { cam: [-1.5, 1.7, 3.2], look: [-4, 1.4, -3] },
  symptom: { cam: [0, 1.4, 2.6], look: [0, 1.5, -5] },
  impact: { cam: [1.8, 1.7, 3.2], look: [4, 1.0, -3] },
};

const CameraRig = ({ activeState }: { activeState: JourneyState }) => {
  const posRef = useRef(new THREE.Vector3(...ZONES.root.cam));
  const lookRef = useRef(new THREE.Vector3(...ZONES.root.look));

  useFrame((state, dt) => {
    const zone = ZONES[activeState] ?? ZONES.root;
    posRef.current.lerp(new THREE.Vector3(...zone.cam), 1 - Math.exp(-3 * dt));
    lookRef.current.lerp(new THREE.Vector3(...zone.look), 1 - Math.exp(-3 * dt));
    state.camera.position.copy(posRef.current);
    state.camera.lookAt(lookRef.current);
  });

  return null;
};

type MindstormJourneyLabProps = {
  activeDomain: JourneyState;
  onSelectDomain: (domain: Exclude<JourneyState, "root">) => void;
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  selectedEdgeId?: string;
  onEdgeSelect: (edge: ConnectionEdge) => void;
  series: ThemeSeries[];
  entries: JournalEntry[];
};

const MindstormJourneyLab = ({
  activeDomain,
  onSelectDomain,
  nodes,
  edges,
  selectedEdgeId,
  onEdgeSelect,
  series,
  entries,
}: MindstormJourneyLabProps) => {
  const [walkTarget, setWalkTarget] = useState<number | null>(null);
  const [attentionToken, setAttentionToken] = useState(0);
  const [attentionYaw, setAttentionYaw] = useState(0);

  const fog = useMemo(() => {
    if (activeDomain === "symptom") return { color: "#eef2ff", near: 2.5, far: 10 };
    if (activeDomain === "context") return { color: "#f0f9ff", near: 3, far: 11 };
    if (activeDomain === "impact") return { color: "#fff7ed", near: 3, far: 10 };
    return { color: "#f8fafc", near: 3.5, far: 12 };
  }, [activeDomain]);

  const handleFocus = (domain: Exclude<JourneyState, "root">) => {
    if (activeDomain === domain) {
      onSelectDomain("root");
      setWalkTarget(null);
      setAttentionYaw(0);
      return;
    }
    onSelectDomain(domain);
    setAttentionToken((prev) => prev + 1);
    if (domain === "context") {
      setWalkTarget(-0.9);
      setAttentionYaw(0.8);
    } else if (domain === "impact") {
      setWalkTarget(0.9);
      setAttentionYaw(-0.8);
    } else if (domain === "symptom") {
      setWalkTarget(0);
      setAttentionYaw(0);
    }
  };

  return (
    <div className="h-[560px] w-full">
      <Canvas shadows camera={{ fov: 50, position: ZONES.root.cam }}>
        <color attach="background" args={[fog.color]} />
        <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
        <ambientLight intensity={0.6} />
        <spotLight position={[6, 8, 4]} angle={0.4} penumbra={0.6} intensity={1} castShadow />
        <CameraRig activeState={activeDomain} />
        <Environment preset="studio" />

        <group scale={5.625} position={[0, 0, 0]}>
          <MindstormWalker
            isWalking={walkTarget != null}
            walkMode="target"
            walkTarget={walkTarget}
            attentionToken={attentionToken}
            attentionYaw={attentionYaw}
            cloneScene
          />
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[22, 22]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>

        <ConstellationTotem
          active={activeDomain === "context"}
          onEnter={() => handleFocus("context")}
          nodes={nodes}
          edges={edges}
          onEdgeSelect={onEdgeSelect}
          selectedEdgeId={selectedEdgeId}
        />
        <SymptomTotem
          active={activeDomain === "symptom"}
          onEnter={() => handleFocus("symptom")}
          series={series}
        />
        <ImpactTotem
          active={activeDomain === "impact"}
          onEnter={() => handleFocus("impact")}
          entries={entries}
        />
      </Canvas>
    </div>
  );
};

export default MindstormJourneyLab;
