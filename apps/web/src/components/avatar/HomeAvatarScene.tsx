import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Text } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";

export type HomeAvatarDomain = "root" | "context" | "symptom" | "impact";

export type SceneEmotion = {
  label: string;
  intensity: number;
  tone: "positive" | "negative" | "neutral";
  count?: number;
};

type HomeAvatarSceneProps = {
  activeDomain: HomeAvatarDomain;
  onSelectDomain: (domain: HomeAvatarDomain) => void;
  moodIntensity?: number;
  enableIdleWave?: boolean;
  emotions?: SceneEmotion[];
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
  hidden = false,
}: {
  position: [number, number, number];
  label: string;
  color: string;
  onClick: () => void;
  active: boolean;
  hidden?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textRef = useRef<THREE.Mesh | null>(null);
  const opacityRef = useRef(hidden ? 0 : 0.8);

  useFrame((_, dt) => {
    const target = hidden ? 0 : 0.8;
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, target, 1 - Math.exp(-4 * dt));
    const labelOpacity = opacityRef.current / 0.8;
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacityRef.current;
      material.transparent = true;
      material.depthWrite = false;
      material.depthTest = true;
      meshRef.current.visible = opacityRef.current > 0.02;
    }
    if (textRef.current) {
      const material = textRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = labelOpacity;
      material.transparent = true;
      material.depthWrite = false;
      material.depthTest = true;
      textRef.current.visible = labelOpacity > 0.02;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(event) => {
            if (hidden) return;
            event.stopPropagation();
            onClick();
          }}
          onPointerOver={() => {
            if (!hidden) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.8 : 0.2} transparent />
        </mesh>
        <Text
          ref={textRef}
          position={[0, 0.6, 0]}
          fontSize={0.15}
          color="#475569"
          outlineWidth={0.01}
          outlineColor="#ffffff"
        >
          {label}
        </Text>
      </Float>
    </group>
  );
};

const toneColor: Record<SceneEmotion["tone"], string> = {
  positive: "#14b8a6",
  negative: "#f43f5e",
  neutral: "#6366f1",
};

const EmotionCloud = ({ emotions }: { emotions: SceneEmotion[] }) => {
  const positions = useMemo(() => {
    const total = Math.max(1, emotions.length);
    const counts = emotions.map((emotion) => emotion.count ?? 1);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const normalize = (value: number) =>
      maxCount === minCount ? 0.5 : (value - minCount) / (maxCount - minCount);

    return emotions.map((emotion, i) => {
      const weight = normalize(emotion.count ?? 1);
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      const radius = 2.1 - weight * 0.7 + (i % 3) * 0.08;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi) * (0.55 - weight * 0.1);
      const z = radius * Math.cos(phi) - 1.6 + weight * 0.3;
      return [x, y, z] as [number, number, number];
    });
  }, [emotions]);

  return (
    <group position={[0, 1.7, -1.2]}>
      {emotions.map((emotion, i) => {
        const sizeByCount = emotion.count ? Math.min(0.06, emotion.count * 0.008) : 0;
        const fontSize = 0.1 + (emotion.intensity / 100) * 0.04 + sizeByCount;
        return (
          <Float
            key={`${emotion.label}-${i}`}
            speed={1}
            rotationIntensity={0.3}
            floatIntensity={0.3}
            position={positions[i]}
          >
            <Text
              fontSize={fontSize}
              color={toneColor[emotion.tone]}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="#ffffff"
            >
              {emotion.label}
            </Text>
          </Float>
        );
      })}
    </group>
  );
};

const HomeAvatarScene = ({
  activeDomain,
  onSelectDomain,
  moodIntensity = 0.5,
  enableIdleWave = false,
  emotions = [],
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
          attentionToken={activeDomain === "symptom" ? 1 : 0}
        />
      </group>

      {activeDomain === "symptom" && emotions.length > 0 && <EmotionCloud emotions={emotions} />}

      <Totem
        position={[-2, 2.1, -3.4]}
        label="Context"
        color="#94a3b8"
        active={activeDomain === "context"}
        hidden={activeDomain === "symptom"}
        onClick={() => onSelectDomain(activeDomain === "context" ? "root" : "context")}
      />

      {activeDomain !== "symptom" && (
        <Totem
          position={[0, 2.7, -4.6]}
          label="Feelings"
          color="#818cf8"
          active={activeDomain === "symptom"}
          onClick={() => onSelectDomain(activeDomain === "symptom" ? "root" : "symptom")}
        />
      )}

      <Totem
        position={[2, 2.1, -3.4]}
        label="Life"
        color="#fb923c"
        active={activeDomain === "impact"}
        hidden={activeDomain === "symptom"}
        onClick={() => onSelectDomain(activeDomain === "impact" ? "root" : "impact")}
      />

      <ContactShadows opacity={0.4} scale={10} blur={2} far={4} />
    </Canvas>
  );
};

export default HomeAvatarScene;
