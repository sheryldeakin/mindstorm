import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";
import type { DomainKey } from "../features/MindMapOverlayLab";

const CAMERA_ZONES: Record<DomainKey, { pos: [number, number, number]; target: [number, number, number] }> = {
  root: { pos: [0, 1.6, 4.5], target: [0, 0.9, 0] },
  symptom: { pos: [0, 1.3, 2.2], target: [0, 1.1, 0] },
  context: { pos: [-2.3, 1.7, 3.6], target: [-1, 1.0, 0] },
  impact: { pos: [2.3, 1.7, 3.6], target: [1, 1.0, 0] },
};

const CameraRig = ({ activeDomain }: { activeDomain: DomainKey }) => {
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

type MindstormFigureSceneLabProps = {
  activeDomain?: DomainKey;
  onSelectDomain?: (domain: Exclude<DomainKey, "root">) => void;
  walkTarget?: number | null;
};

const MindstormFigureSceneLab = ({
  activeDomain = "root",
  onSelectDomain,
  walkTarget = null,
}: MindstormFigureSceneLabProps) => {
  const fog = useMemo(() => {
    if (activeDomain === "symptom") return { color: "#eef2ff", near: 2, far: 10 };
    if (activeDomain === "context") return { color: "#f0f9ff", near: 2.5, far: 11 };
    if (activeDomain === "impact") return { color: "#fff7ed", near: 2.5, far: 10 };
    return { color: "#f8fafc", near: 3, far: 12 };
  }, [activeDomain]);

  return (
    <div className="h-[560px] w-full">
      <Canvas shadows camera={{ fov: 45, position: CAMERA_ZONES.root.pos }}>
        <color attach="background" args={[fog.color]} />
        <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <CameraRig activeDomain={activeDomain} />
        <Environment preset="studio" />
        <group scale={5.625} position={[0, 0, 0]}>
          <MindstormWalker
            isWalking={walkTarget != null}
            walkMode="target"
            walkTarget={walkTarget}
            attentionToken={activeDomain === "root" ? 0 : 1}
            attentionYaw={
              activeDomain === "context"
                ? 0.8
                : activeDomain === "impact"
                  ? -0.8
                  : 0
            }
            cloneScene
          />
        </group>

        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.01, -2]} receiveShadow>
            <planeGeometry args={[3.5, 5]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]} receiveShadow>
            <planeGeometry args={[3.5, 7]} />
            <meshStandardMaterial color="#e0e7ff" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.01, -2]} receiveShadow>
            <planeGeometry args={[3.5, 5]} />
            <meshStandardMaterial color="#ffedd5" />
          </mesh>

          <group
            position={[-3, 0, -2]}
            onClick={() => onSelectDomain?.("context")}
          >
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[0.5, 2, 0.5]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[-0.8, 0.6, 0.4]} castShadow>
              <boxGeometry args={[0.4, 1.2, 0.4]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <Text position={[0, 2.5, 0]} fontSize={0.22} color="#475569">
              My Context
            </Text>
          </group>

          <group
            position={[0, 1.2, -4]}
            onClick={() => onSelectDomain?.("symptom")}
          >
            <mesh>
              <sphereGeometry args={[0.85, 32, 32]} />
              <meshStandardMaterial color="#a5b4fc" transparent opacity={0.6} />
            </mesh>
            <Text position={[0, 1.2, 0]} fontSize={0.22} color="#4f46e5">
              My Feelings
            </Text>
          </group>

          <group
            position={[3, 0, -2]}
            onClick={() => onSelectDomain?.("impact")}
          >
            <mesh position={[-0.6, 1, 0]} castShadow>
              <boxGeometry args={[0.25, 2, 0.25]} />
              <meshStandardMaterial color="#fdba74" />
            </mesh>
            <mesh position={[0.6, 1, 0]} castShadow>
              <boxGeometry args={[0.25, 2, 0.25]} />
              <meshStandardMaterial color="#fdba74" />
            </mesh>
            <mesh position={[0, 2, 0]} castShadow>
              <boxGeometry args={[1.3, 0.25, 0.25]} />
              <meshStandardMaterial color="#fb923c" />
            </mesh>
            <Text position={[0, 2.6, 0]} fontSize={0.22} color="#ea580c">
              My Life
            </Text>
          </group>
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default MindstormFigureSceneLab;
