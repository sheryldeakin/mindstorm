import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";
import { ConstellationTotem, ImpactTotem, SymptomTotem } from "./DataMonumentsLab";

export type HomeAvatarDomain = "root" | "context" | "symptom" | "impact";

type HomeAvatarSceneProps = {
  activeDomain: HomeAvatarDomain;
  onSelectDomain: (domain: HomeAvatarDomain) => void;
  moodIntensity?: number;
};

const CAMERA_ZONES: Record<HomeAvatarDomain, { pos: [number, number, number]; target: [number, number, number] }> = {
  root: { pos: [0, 1.6, 4.5], target: [0, 0.9, 0] },
  symptom: { pos: [0, 1.3, 2.2], target: [0, 1.1, 0] },
  context: { pos: [-2.4, 1.6, 3.4], target: [-1.1, 1.0, 0] },
  impact: { pos: [2.4, 1.6, 3.4], target: [1.1, 1.0, 0] },
};

const CameraRig = ({ activeDomain }: { activeDomain: HomeAvatarDomain }) => {
  const posRef = useRef(new THREE.Vector3(...CAMERA_ZONES.root.pos));
  const targetRef = useRef(new THREE.Vector3(...CAMERA_ZONES.root.target));

  useFrame((state, dt) => {
    const zone = CAMERA_ZONES[activeDomain] ?? CAMERA_ZONES.root;
    posRef.current.lerp(new THREE.Vector3(...zone.pos), 1 - Math.exp(-3 * dt));
    targetRef.current.lerp(new THREE.Vector3(...zone.target), 1 - Math.exp(-3 * dt));
    state.camera.position.copy(posRef.current);
    state.camera.lookAt(targetRef.current);
  });

  return null;
};

const HomeAvatarScene = ({ activeDomain, onSelectDomain, moodIntensity = 0.5 }: HomeAvatarSceneProps) => {
  const fogColor = useMemo(() => "#ffffff", []);

  const handleSelect = (domain: HomeAvatarDomain) => {
    onSelectDomain(activeDomain === domain ? "root" : domain);
  };

  return (
    <div className="absolute inset-0">
      <Canvas shadows camera={{ fov: 45, position: CAMERA_ZONES.root.pos }}>
        <color attach="background" args={[fogColor]} />
        <fog attach="fog" args={[fogColor, 4, 14]} />

        <CameraRig activeDomain={activeDomain} />
        <ambientLight intensity={0.8} />
        <spotLight position={[5, 6, 4]} intensity={1.1} castShadow />
        <Environment preset="city" />

        <group scale={5.4} position={[0, 0, 0]}>
          <MindstormWalker
            isWalking={false}
            attentionToken={activeDomain === "root" ? 0 : 1}
            attentionYaw={activeDomain === "context" ? 0.8 : activeDomain === "impact" ? -0.8 : 0}
            cloneScene
          />
        </group>

        <group position={[-2.5, 0, -1]}>
          <ConstellationTotem
            active={activeDomain === "context"}
            detail={false}
            onEnter={() => handleSelect("context")}
            onDeepDive={() => {}}
            nodes={[]}
            edges={[]}
            onEdgeSelect={() => {}}
          />
        </group>

        <group position={[0, 0.5, -3]}>
          <SymptomTotem
            active={activeDomain === "symptom"}
            detail={false}
            onEnter={() => handleSelect("symptom")}
            onDeepDive={() => {}}
            series={[]}
          />
        </group>

        <group position={[2.5, 0, -1]}>
          <ImpactTotem
            active={activeDomain === "impact"}
            detail={false}
            onEnter={() => handleSelect("impact")}
            onDeepDive={() => {}}
            entries={[]}
          />
        </group>

        <ContactShadows opacity={0.35} scale={10} blur={2.4} far={4} />
      </Canvas>
    </div>
  );
};

export default HomeAvatarScene;
