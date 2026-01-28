import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AccumulativeShadows, Environment, RandomizedLight } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";
import { ConstellationTotem, ImpactTotem, SymptomTotem } from "./DataMonumentsLab";
import { PathFloor } from "./PathFloor";
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
    if (activeDomain === "symptom") return { color: "#f8f7ff", near: 3.5, far: 10 };
    if (activeDomain === "context") return { color: "#f7fcff", near: 4, far: 12 };
    if (activeDomain === "impact") return { color: "#fffaf4", near: 4, far: 11 };
    return { color: "#ffffff", near: 4.5, far: 13 };
  }, [activeDomain]);

  const [detailDomain, setDetailDomain] = useState<JourneyState | null>(null);
  useEffect(() => {
    if (activeDomain === "root" && detailDomain !== null) {
      setDetailDomain(null);
    }
  }, [activeDomain, detailDomain]);
  const handleFocus = (domain: Exclude<JourneyState, "root">) => {
    if (activeDomain === domain) {
      onSelectDomain("root");
      setWalkTarget(null);
      setAttentionYaw(0);
      setDetailDomain(null);
      return;
    }
    onSelectDomain(domain);
    setDetailDomain(null);
    setAttentionToken((prev) => prev + 1);
    if (domain === "context") {
      setWalkTarget(-1.1);
      setAttentionYaw(0.8);
    } else if (domain === "impact") {
      setWalkTarget(1.1);
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
        <ambientLight intensity={0.85} />
        <spotLight position={[6, 8, 4]} angle={0.4} penumbra={0.6} intensity={1} castShadow />
        <CameraRig activeState={activeDomain} />
        <Environment preset="studio" />

        <group scale={5.625} position={[0, -0.16, 0]}>
          <MindstormWalker
            isWalking={walkTarget != null}
            walkMode="target"
            walkTarget={walkTarget}
            attentionToken={attentionToken}
            attentionYaw={attentionYaw}
            cloneScene
          />
        </group>

        <PathFloor activeDomain={activeDomain} />


        <ConstellationTotem
          active={activeDomain === "context"}
          detail={detailDomain === "context"}
          onEnter={() => handleFocus("context")}
          onDeepDive={() => setDetailDomain("context")}
          nodes={nodes}
          edges={edges}
          onEdgeSelect={onEdgeSelect}
          selectedEdgeId={selectedEdgeId}
        />
        <SymptomTotem
          active={activeDomain === "symptom"}
          detail={detailDomain === "symptom"}
          onEnter={() => handleFocus("symptom")}
          onDeepDive={() => setDetailDomain("symptom")}
          series={series}
        />
        <ImpactTotem
          active={activeDomain === "impact"}
          detail={detailDomain === "impact"}
          onEnter={() => handleFocus("impact")}
          onDeepDive={() => setDetailDomain("impact")}
          entries={entries}
        />
        <AccumulativeShadows
          temporal={false}
          frames={1}
          color="#ffffff"
          colorBlend={0.05}
          opacity={0.01}
          scale={12}
          alphaTest={0.95}
        >
          <RandomizedLight amount={2} radius={2} ambient={1} intensity={0.2} position={[4, 6, -8]} bias={0.001} />
        </AccumulativeShadows>
      </Canvas>
    </div>
  );
};

export default MindstormJourneyLab;
