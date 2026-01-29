import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Text } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";

export type HomeAvatarDomain = "root" | "context" | "symptom" | "impact";

type HomeAvatarSceneProps = {
  activeDomain: HomeAvatarDomain;
  onSelectDomain: (domain: HomeAvatarDomain) => void;
  moodIntensity?: number;
  enableIdleWave?: boolean;
};

const CAMERA_ZONES: Record<HomeAvatarDomain, { pos: [number, number, number]; look: [number, number, number] }> = {
  root: { pos: [0, 1.6, 5.5], look: [0, 0.9, 0] },
  context: { pos: [-2.5, 1.8, 3.5], look: [-1, 1.0, 0] },
  symptom: { pos: [0, 1.4, 2.5], look: [0, 1.1, 0] },
  impact: { pos: [2.5, 1.8, 3.5], look: [1, 1.0, 0] },
};

const CameraRig = ({ activeDomain }: { activeDomain: HomeAvatarDomain }) => {
  useFrame((state, delta) => {
    const target = CAMERA_ZONES[activeDomain] || CAMERA_ZONES.root;
    state.camera.position.lerp(new THREE.Vector3(...target.pos), 2.5 * delta);
    const currentLook = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(state.camera.quaternion)
      .add(state.camera.position);
    const targetLook = new THREE.Vector3(...target.look);
    currentLook.lerp(targetLook, 2.5 * delta);
    state.camera.lookAt(currentLook);
  });
  return null;
};

const Totem = ({
  position,
  label,
  color,
  onClick,
  active,
}: {
  position: [number, number, number];
  label: string;
  color: string;
  onClick: () => void;
  active: boolean;
}) => (
  <group
    position={position}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.8 : 0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      <Text position={[0, 0.6, 0]} fontSize={0.15} color="#475569">
        {label}
      </Text>
    </Float>
  </group>
);

const HomeAvatarScene = ({
  activeDomain,
  onSelectDomain,
  moodIntensity = 0.5,
  enableIdleWave = false,
}: HomeAvatarSceneProps) => {
  const fogConfig = useMemo(() => {
    const color = moodIntensity > 0.7 ? "#e0e7ff" : "#f8fafc";
    const far = 20 - moodIntensity * 6;
    return { color, far };
  }, [moodIntensity]);
  const [wavePulse, setWavePulse] = useState(false);
  const waveTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enableIdleWave) {
      if (waveTimeoutRef.current) window.clearTimeout(waveTimeoutRef.current);
      if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
      setWavePulse(false);
      return () => {};
    }

    const scheduleWave = (delayMs: number) => {
      waveTimeoutRef.current = window.setTimeout(() => {
        setWavePulse(true);
        resetTimeoutRef.current = window.setTimeout(() => {
          setWavePulse(false);
          scheduleWave(45000);
        }, 900);
      }, delayMs);
    };

    setWavePulse(true);
    resetTimeoutRef.current = window.setTimeout(() => {
      setWavePulse(false);
      scheduleWave(45000);
    }, 900);

    return () => {
      if (waveTimeoutRef.current) window.clearTimeout(waveTimeoutRef.current);
      if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
    };
  }, [enableIdleWave]);

  return (
    <Canvas shadows camera={{ fov: 45 }}>
      <color attach="background" args={[fogConfig.color]} />
      <fog attach="fog" args={[fogConfig.color, 5, fogConfig.far]} />

      <CameraRig activeDomain={activeDomain} />
      <ambientLight intensity={0.6} />
      <spotLight position={[1, 2, 2]} intensity={1} castShadow />
      <Environment preset="city" />

      <group scale={8.4} position={[0, -0.45, 0]}>
        <MindstormWalker
          isWalking={false}
          wave={wavePulse}
          attentionYaw={activeDomain === "context" ? 0.8 : activeDomain === "impact" ? -0.8 : 0}
        />
      </group>

      <Totem
        position={[-2, 2.1, -3.4]}
        label="Context"
        color="#94a3b8"
        active={activeDomain === "context"}
        onClick={() => onSelectDomain(activeDomain === "context" ? "root" : "context")}
      />

      <Totem
        position={[0, 2.7, -4.6]}
        label="Feelings"
        color="#818cf8"
        active={activeDomain === "symptom"}
        onClick={() => onSelectDomain(activeDomain === "symptom" ? "root" : "symptom")}
      />

      <Totem
        position={[2, 2.1, -3.4]}
        label="Life"
        color="#fb923c"
        active={activeDomain === "impact"}
        onClick={() => onSelectDomain(activeDomain === "impact" ? "root" : "impact")}
      />

      <ContactShadows opacity={0.4} scale={10} blur={2} far={4} />
    </Canvas>
  );
};

export default HomeAvatarScene;
