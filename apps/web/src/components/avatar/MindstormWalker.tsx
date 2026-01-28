import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";

type MindstormWalkerProps = {
  isWalking?: boolean;
  wave?: boolean;
  onReady?: () => void;
  boundsX?: number;
  boundsZ?: number;
  speed?: number;
  arrive?: number;
  turn?: number;
  fade?: number;
  targetIntervalMs?: number;
  lookStrengthIdle?: number;
  lookStrengthWalk?: number;
  cloneScene?: boolean;
};

export const MindstormWalker = forwardRef<THREE.Group, MindstormWalkerProps>(
  (
    {
      isWalking = false,
      wave = false,
      onReady,
      boundsX = 0.12,
      boundsZ = 0,
      speed = 0.03,
      arrive = 0.15,
      turn = 3,
      fade = 0.25,
      targetIntervalMs = 3500,
      lookStrengthIdle = 0.35,
      lookStrengthWalk = 0.12,
      cloneScene = false,
    },
    ref,
  ) => {
    const walkerRef = useRef<THREE.Group | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const { scene: baseScene, animations: baseAnimations } = useGLTF("/models/mindstorm_character.glb");
    const { scene, animations } = useMemo(() => {
      if (!cloneScene) return { scene: baseScene, animations: baseAnimations };
      const clonedScene = clone(baseScene) as THREE.Group;
      const clonedAnimations = baseAnimations.map((clip) => clip.clone());
      return { scene: clonedScene, animations: clonedAnimations };
    }, [baseAnimations, baseScene, cloneScene]);
    const rootBoneName = useMemo(() => {
      if (!scene) return null;
      let candidate: THREE.Bone | null = null;
      scene.traverse((child) => {
        if (!(child as THREE.Bone).isBone) return;
        const bone = child as THREE.Bone;
        if (!candidate) candidate = bone;
        const parentIsBone = (bone.parent as THREE.Object3D | null)?.type === "Bone";
        if (!parentIsBone) candidate = bone;
      });
      return candidate?.name ?? null;
    }, [scene]);
    const rootMotionNodeName = useMemo(() => {
      if (!animations?.length) return rootBoneName;
      for (const clip of animations) {
        const positionTrack = clip.tracks.find((track) => track.name.endsWith(".position"));
        if (positionTrack) return positionTrack.name.replace(/\.position$/, "");
      }
      return rootBoneName;
    }, [animations, rootBoneName]);
    const strippedAnimations = useMemo(() => {
      if (!animations?.length || !rootMotionNodeName) return animations;
      return animations.map((clip) => {
        const prefix = `${rootMotionNodeName}.`;
        const tracks = clip.tracks.filter((track) => {
          const name = track.name;
          if (!name.startsWith(prefix)) return true;
          return (
            !name.endsWith(".position") &&
            !name.endsWith(".quaternion") &&
            !name.endsWith(".rotation")
          );
        });
        if (tracks.length === clip.tracks.length) return clip;
        return new THREE.AnimationClip(clip.name, clip.duration, tracks);
      });
    }, [animations, rootBoneName]);
    const { actions } = useAnimations(strippedAnimations, modelRef);
    const neckRef = useRef<THREE.Bone | null>(null);
    const upperRef = useRef<THREE.Bone | null>(null);
    const chestRef = useRef<THREE.Bone | null>(null);
    const spineRef = useRef<THREE.Bone | null>(null);
    const lookYaw = useRef(0);
    const lookPitch = useRef(0);
    const raycasterRef = useRef(new THREE.Raycaster());
    const planeRef = useRef(new THREE.Plane());
    const hitRef = useRef(new THREE.Vector3());
    const headRef = useRef(new THREE.Vector3());
    const dirRef = useRef(new THREE.Vector3());
    const camDirRef = useRef(new THREE.Vector3());
    const HEAD_HEIGHT = 1.1;

    const phase = useRef(0);
    const current = useRef("IDLE");
    const isWaving = useRef(false);
    const pauseFactor = 0.2;

    useImperativeHandle(ref, () => modelRef.current as THREE.Group);

    const play = (name: string) => {
      if (isWaving.current) return;
      const nextAction = actions?.[name];
      if (!nextAction || current.current === name) return;
      actions?.[current.current]?.fadeOut(fade);
      nextAction.reset().fadeIn(fade).play();
      current.current = name;
    };

    useEffect(() => {
      if (!actions) return;

      actions.IDLE?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      actions.WALK?.setLoop(THREE.LoopRepeat, Infinity);
      actions.WAVE?.setLoop(THREE.LoopOnce, 1);
    }, [actions]);

    useEffect(() => {
      if (!scene) return;
      let neck: THREE.Bone | null = null;
      let upper: THREE.Bone | null = null;
      let chest: THREE.Bone | null = null;
      let spine: THREE.Bone | null = null;
      scene.traverse((child) => {
        if (!(child as THREE.Bone).isBone) return;
        const bone = child as THREE.Bone;
        const name = bone.name.toLowerCase();
        if (!neck && name.includes("neck")) neck = bone;
        if (!upper && name.includes("upper") && name.includes("chest")) upper = bone;
        if (!chest && name.includes("chest")) chest = bone;
        if (!spine && name.includes("spine")) spine = bone;
      });
      if (!neck || !upper || !chest || !spine) {
        const bones: THREE.Bone[] = [];
        scene.updateWorldMatrix(true, true);
        scene.traverse((child) => {
          if ((child as THREE.Bone).isBone) bones.push(child as THREE.Bone);
        });
        if (bones.length) {
          const withY = bones.map((bone) => {
            const pos = new THREE.Vector3();
            bone.getWorldPosition(pos);
            return { bone, y: pos.y };
          });
          const minY = Math.min(...withY.map((entry) => entry.y));
          const maxY = Math.max(...withY.map((entry) => entry.y));
          const pickClosest = (t: number) => {
            let best = withY[0];
            let bestDist = Math.abs(best.y - t);
            for (const entry of withY) {
              const dist = Math.abs(entry.y - t);
              if (dist < bestDist) {
                best = entry;
                bestDist = dist;
              }
            }
            return best.bone;
          };
          const height = Math.max(0.0001, maxY - minY);
          const spineTarget = minY + height * 0.45;
          const chestTarget = minY + height * 0.62;
          const upperTarget = minY + height * 0.72;
          const neckTarget = minY + height * 0.84;
          spine = spine ?? pickClosest(spineTarget);
          chest = chest ?? pickClosest(chestTarget);
          upper = upper ?? pickClosest(upperTarget);
          neck = neck ?? pickClosest(neckTarget);
        }
      }
      neckRef.current = neck;
      upperRef.current = upper;
      chestRef.current = chest;
      spineRef.current = spine;
    }, [scene]);

    useEffect(() => {
      if (!wave || !actions?.WAVE) return;
      const prev = current.current;
      isWaving.current = true;
      actions[prev]?.fadeOut(0.2);

      const waveAction = actions.WAVE;
      waveAction.reset();
      waveAction.setLoop(THREE.LoopOnce, 1);
      waveAction.clampWhenFinished = true;
      waveAction.fadeIn(0.2).play();
      current.current = "WAVE";

      const restore = () => {
        waveAction.fadeOut(0.2);
        isWaving.current = false;
        play(prev);
      };

      const mixer = waveAction.getMixer();
      mixer.addEventListener("finished", restore);

      return () => {
        mixer.removeEventListener("finished", restore);
      };
    }, [actions, wave, fade]);

    const lerpAngle = (from: number, to: number, t: number) => {
      const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
      return from + delta * t;
    };

    useFrame((state, dt) => {
      const walker = walkerRef.current;
      if (!walker) return;

      if (!isWalking) {
        play("IDLE");
        walker.position.lerp(new THREE.Vector3(0, 0, 0), 0.06);
        walker.rotation.y = THREE.MathUtils.lerp(walker.rotation.y, 0, 0.06);
      }

      if (isWaving.current) return;

      let desiredYaw = walker.rotation.y;
      if (isWalking) {
        play("WALK");
        const safeBounds = Math.max(boundsX, 0.001);
        const angularSpeed = speed / safeBounds;
        const speedFactor = THREE.MathUtils.lerp(
          pauseFactor,
          1,
          Math.min(1, Math.abs(Math.cos(phase.current))),
        );
        phase.current += angularSpeed * speedFactor * dt;
        if (phase.current > Math.PI * 2) phase.current -= Math.PI * 2;

        const sinPhase = Math.sin(phase.current);
        const cosPhase = Math.cos(phase.current);
        walker.position.x = sinPhase * safeBounds;

        walker.position.z = 0;
        desiredYaw = cosPhase > 0 ? Math.PI / 2 : -Math.PI / 2;
        walker.rotation.y = lerpAngle(
          walker.rotation.y,
          desiredYaw,
          1 - Math.exp(-turn * dt),
        );
      }

      // Prevent root-motion drift from the animation.
      if (modelRef.current) {
        modelRef.current.position.set(0, 0, 0);
        modelRef.current.rotation.set(0, 0, 0);
      }

      const raycaster = raycasterRef.current;
      const plane = planeRef.current;
      const hit = hitRef.current;
      const head = headRef.current;
      const dirVec = dirRef.current;
      const camDir = camDirRef.current;
      raycaster.setFromCamera(state.pointer, state.camera);
      state.camera.getWorldDirection(camDir);
      const worldPos = new THREE.Vector3();
      walker.getWorldPosition(worldPos);
      head.copy(worldPos).add(new THREE.Vector3(0, HEAD_HEIGHT, 0));
      plane.setFromNormalAndCoplanarPoint(camDir, head);
      const hasHit = raycaster.ray.intersectPlane(plane, hit);
      if (hasHit) {
        dirVec.copy(hit).sub(head);
        const targetYaw = Math.atan2(dirVec.x, dirVec.z);
        const deltaYaw = THREE.MathUtils.euclideanModulo(targetYaw - walker.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
        const targetPitch = -Math.atan2(dirVec.y, Math.sqrt(dirVec.x * dirVec.x + dirVec.z * dirVec.z));
        const strength = isWalking ? lookStrengthWalk : lookStrengthIdle;
        const cursorYaw = deltaYaw * strength;
        const travelBias = isWalking ? (desiredYaw - walker.rotation.y) * 0.15 : 0;
        const nextYaw = cursorYaw + travelBias;
        const nextPitch = targetPitch * strength * 0.6;

        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, nextYaw, 1 - Math.exp(-6 * dt));
        lookPitch.current = THREE.MathUtils.lerp(lookPitch.current, nextPitch, 1 - Math.exp(-6 * dt));
      }

      const applyBone = (
        bone: THREE.Bone | null,
        yaw: number,
        pitch: number,
        yawWeight: number,
        pitchWeight: number,
      ) => {
        if (!bone) return;
        const base = bone.rotation;
        bone.rotation.set(
          base.x + pitch * pitchWeight,
          base.y + yaw * yawWeight,
          base.z,
        );
      };

      const yaw = lookYaw.current;
      const pitch = lookPitch.current;
      applyBone(upperRef.current, yaw, pitch, 0.35, 0.25);
      applyBone(chestRef.current, yaw, pitch, 0.45, 0.35);
      applyBone(spineRef.current, yaw, pitch, 0.25, 0.15);
      applyBone(neckRef.current, yaw, pitch, 0.8, 0.65);
    });

    useEffect(() => {
      if (scene) onReady?.();
    }, [scene, onReady]);

    return (
      <group ref={walkerRef}>
        <group ref={modelRef} position={[0, 0, 0]}>
          <primitive object={scene} />
        </group>
      </group>
    );
  },
);

MindstormWalker.displayName = "MindstormWalker";

useGLTF.preload("/models/mindstorm_character.glb");
