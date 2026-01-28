import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { MindstormWalker } from "./MindstormWalker";

const FIGURE_CAMERA_POS: [number, number, number] = [0, 1.6, 4.2];
const FIGURE_CAMERA_LOOK_AT: [number, number, number] = [0, 0.9, 0];
const FIGURE_MODEL_SCALE = 5.625;
const FIGURE_ORTHO_ZOOM = 180;

const StaticOrthoCamera = ({
  position,
  lookAt,
  zoom,
}: {
  position: [number, number, number];
  lookAt: [number, number, number];
  zoom: number;
}) => {
  const { camera, size } = useThree();

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.position.set(...position);
    ortho.near = 0.01;
    ortho.far = 1000;
    ortho.left = size.width / -2;
    ortho.right = size.width / 2;
    ortho.top = size.height / 2;
    ortho.bottom = size.height / -2;
    ortho.zoom = zoom;
    ortho.up.set(0, 1, 0);
    ortho.lookAt(...lookAt);
    ortho.updateProjectionMatrix();
    ortho.updateMatrixWorld(true);
    ortho.matrixAutoUpdate = false;
    ortho.matrixWorldAutoUpdate = false;
  }, [camera, lookAt, position, size.height, size.width, zoom]);

  return null;
};

const MindstormFigureScene = () => {
  return (
    <div className="h-[360px] w-[220px]">
      <Canvas orthographic camera={{ position: FIGURE_CAMERA_POS, zoom: FIGURE_ORTHO_ZOOM }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <group scale={FIGURE_MODEL_SCALE} position={[0, 0, 0]}>
            <MindstormWalker
              isWalking={false}
              wave={false}
              lookStrengthIdle={0.45}
              lookStrengthWalk={0.12}
              cloneScene
            />
          </group>
        </Suspense>
        <StaticOrthoCamera
          position={FIGURE_CAMERA_POS}
          lookAt={FIGURE_CAMERA_LOOK_AT}
          zoom={FIGURE_ORTHO_ZOOM}
        />
      </Canvas>
    </div>
  );
};

export default MindstormFigureScene;
