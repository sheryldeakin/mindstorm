import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type MindstormCharacterProps = {
  isWalking?: boolean;
  wave?: boolean;
  onReady?: () => void;
};

export const MindstormCharacter = forwardRef<THREE.Group, MindstormCharacterProps>(
  ({ isWalking = false, wave = false, onReady }: MindstormCharacterProps, ref) => {
    const group = useRef<THREE.Group | null>(null);
    const { scene, animations } = useGLTF("/models/mindstorm_character.glb");
    const { actions } = useAnimations(animations, group);
    const currentAction = useRef<string>("IDLE");

    useImperativeHandle(ref, () => group.current as THREE.Group);

    const fadeTo = (name: string, duration = 0.3) => {
      const nextAction = actions?.[name];
      if (!nextAction || currentAction.current === name) return;

      actions?.[currentAction.current]?.fadeOut(duration);
      nextAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();

      currentAction.current = name;
    };

  useEffect(() => {
    if (!actions) return;
    actions.IDLE?.reset().play();
    if (isWalking) {
      fadeTo("WALK", 0.3);
      actions.WALK?.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      fadeTo("IDLE", 0.3);
      actions.IDLE?.setLoop(THREE.LoopRepeat, Infinity);
      }
    }, [actions, isWalking]);

    useEffect(() => {
      if (!wave || !actions?.WAVE) return;

      const prev = currentAction.current;
      actions[prev]?.fadeOut(0.2);

      const waveAction = actions.WAVE;
      waveAction.reset();
      waveAction.setLoop(THREE.LoopOnce, 1);
      waveAction.clampWhenFinished = true;
      waveAction.fadeIn(0.2).play();
      currentAction.current = "WAVE";

      const restore = () => {
        waveAction.fadeOut(0.2);
        fadeTo(prev, 0.2);
      };

      const mixer = waveAction.getMixer();
      mixer.addEventListener("finished", restore);

      return () => {
        mixer.removeEventListener("finished", restore);
      };
    }, [actions, wave]);

    useEffect(() => {
      if (scene) onReady?.();
    }, [scene, onReady]);

    return (
      <group ref={group}>
        <primitive object={scene} />
      </group>
    );
  },
);

MindstormCharacter.displayName = "MindstormCharacter";

useGLTF.preload("/models/mindstorm_character.glb");
