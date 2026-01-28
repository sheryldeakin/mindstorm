import { Suspense, forwardRef, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import Button from "../ui/Button";
import { MindstormWalker } from "./MindstormWalker";

type FitCameraProps = {
  targetRef: RefObject<THREE.Group | null>;
  ready: boolean;
  fitToken?: number;
  frameOffsetY?: number;
  frameOffsetX?: number;
  modelScale?: number;
  fitPadding?: number;
};

const FIT_PADDING = 2.2;
const MAX_DISTANCE_MULTIPLIER = 2.3;
const TARGET_HEIGHT = 1.0;
const MODEL_SCALE = 0.155;
const FRAME_OFFSET_Y = 0.2;
const MIN_SCALE = 0.05;
const MAX_SCALE = 6;
const USE_FIXED_CAMERA = true;
const FIXED_CAMERA_POS: [number, number, number] = [0, 1.6, 4.2];
const FIXED_MODEL_SCALE = 5.625;
const FIXED_CAMERA_LOOK_AT: [number, number, number] = [0, 0.9, 0];
const ORTHO_ZOOM = 180;
const ORTHO_REFERENCE_HEIGHT = 360;
const WALK_PADDING_RATIO = 0.35;
const MIN_WALK_BOUNDS = 0.1;

const buildMeshBounds = (root: THREE.Object3D) => {
  const box = new THREE.Box3();
  let hasMesh = false;
  root.updateWorldMatrix(true, true);

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.visible || !mesh.geometry || !(mesh as THREE.Mesh).isMesh) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const geomBox = geometry.boundingBox?.clone();
    if (!geomBox) return;
    geomBox.applyMatrix4(mesh.matrixWorld);
    if (!hasMesh) {
      box.copy(geomBox);
      hasMesh = true;
    } else {
      box.union(geomBox);
    }
  });

  return hasMesh ? box : null;
};

const FixedCamera = ({
  position,
  lookAt,
}: {
  position: [number, number, number];
  lookAt: [number, number, number];
}) => {
  const { camera, size } = useThree();

  useEffect(() => {
    const base = camera as THREE.Camera;
    base.position.set(...position);
    base.up.set(0, 1, 0);
    base.lookAt(...lookAt);
    base.updateMatrixWorld(true);
    base.matrixAutoUpdate = false;
    base.matrixWorldAutoUpdate = false;
  }, [camera, lookAt, position]);

  useEffect(() => {
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const ortho = camera as THREE.OrthographicCamera;
      ortho.near = 0.01;
      ortho.far = 1000;
      ortho.left = size.width / -2;
      ortho.right = size.width / 2;
      ortho.top = size.height / 2;
      ortho.bottom = size.height / -2;
      ortho.zoom = ORTHO_ZOOM * (size.height / ORTHO_REFERENCE_HEIGHT);
      ortho.updateProjectionMatrix();
      return;
    }

    const perspective = camera as THREE.PerspectiveCamera;
    perspective.near = 0.01;
    perspective.far = 1000;
    perspective.clearViewOffset();
    perspective.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
};

const FitCamera = ({
  targetRef,
  ready,
  fitToken = 0,
  frameOffsetY = 0,
  frameOffsetX = 0,
  modelScale = MODEL_SCALE,
  fitPadding = FIT_PADDING,
}: FitCameraProps) => {
  const { camera, size } = useThree();
  const appliedScale = useRef<number | null>(null);
  const sizeRef = useRef<THREE.Vector3 | null>(null);
  const distanceRef = useRef<number | null>(null);
  const lastFitTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !targetRef.current) return;
    const applyFixedCamera = () => {
      targetRef.current.position.set(0, 0, 0);
      targetRef.current.scale.setScalar(FIXED_MODEL_SCALE);
      targetRef.current.updateWorldMatrix(true, true);
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.position.set(...FIXED_CAMERA_POS);
      perspective.near = 0.01;
      perspective.far = 1000;
      perspective.clearViewOffset();
      perspective.lookAt(0, 0.9, 0);
      perspective.updateProjectionMatrix();
    };

    if (USE_FIXED_CAMERA) {
      applyFixedCamera();
      return;
    }
    const fitKey = `${fitToken}:${size.width}x${size.height}:${fitPadding}:${MAX_DISTANCE_MULTIPLIER}:${TARGET_HEIGHT}:${modelScale}:${frameOffsetY}:${frameOffsetX}`;
    if (lastFitTokenRef.current !== fitKey) {
      appliedScale.current = null;
    }

    const meshBox = buildMeshBounds(targetRef.current);
    const initialBox = meshBox ?? new THREE.Box3().setFromObject(targetRef.current);
    const initialSize = initialBox.getSize(new THREE.Vector3());

    if (!Number.isFinite(initialSize.y) || initialSize.length() === 0) {
      applyFixedCamera();
      return;
    }

    if (initialSize.y > 0) {
      const scale = THREE.MathUtils.clamp(TARGET_HEIGHT / initialSize.y, MIN_SCALE, MAX_SCALE) * modelScale;
      if (appliedScale.current == null || Math.abs(appliedScale.current - scale) > 0.001) {
        targetRef.current.scale.setScalar(scale);
        targetRef.current.updateWorldMatrix(true, true);
        appliedScale.current = scale;
      }
    }

    const preOffsetBox = buildMeshBounds(targetRef.current) ?? new THREE.Box3().setFromObject(targetRef.current);
    if (preOffsetBox.isEmpty() === false) {
      const center = preOffsetBox.getCenter(new THREE.Vector3());
      // Center X/Z and place feet at y = 0 for consistent framing.
      targetRef.current.position.set(-center.x, -preOffsetBox.min.y, -center.z);
      targetRef.current.updateWorldMatrix(true, true);
    }

    const box = buildMeshBounds(targetRef.current) ?? new THREE.Box3().setFromObject(targetRef.current);
    const sizeVec = box.getSize(new THREE.Vector3());
    if (sizeVec.length() === 0) {
      applyFixedCamera();
      return;
    }

    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = THREE.MathUtils.degToRad(perspective.fov || 50);
    const aspect = size.width / Math.max(1, size.height);
    const fitHeight = (sizeVec.y / 2) / Math.tan(fov / 2);
    const fitWidth = (sizeVec.x / 2) / (Math.tan(fov / 2) * aspect);
    const rawDistance = Math.max(fitHeight, fitWidth) * fitPadding;
    const maxDistance = Math.max(rawDistance, maxDim * MAX_DISTANCE_MULTIPLIER);
    const distance = Math.min(maxDistance, Math.max(rawDistance, maxDim * 0.9));

    sizeRef.current = sizeVec;
    distanceRef.current = distance;
    lastFitTokenRef.current = fitKey;

    const target = box.getCenter(new THREE.Vector3());
    const cameraY = target.y + sizeVec.y * 0.08;
    perspective.position.set(0, cameraY, distance);
    perspective.near = Math.max(distance / 100, 0.01);
    perspective.far = Math.max(distance * 100, 1000);
    perspective.lookAt(target);

    // Keep the camera centered on the character (no manual offset).
    perspective.clearViewOffset();
    perspective.updateProjectionMatrix();

  }, [
    camera,
    fitToken,
    frameOffsetY,
    frameOffsetX,
    fitPadding,
    modelScale,
    ready,
    size.height,
    size.width,
    targetRef,
  ]);

  return null;
};

type WalkerWithBoundsProps = {
  isWalking: boolean;
  wave: boolean;
  onReady: () => void;
};

const WalkerWithBounds = forwardRef<THREE.Group, WalkerWithBoundsProps>(
  ({ isWalking, wave, onReady }, ref) => {
    const { camera, size } = useThree();
    const [boundsX, setBoundsX] = useState(0.12);
    const boundsRef = useRef(boundsX);
    const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const raycasterRef = useRef(new THREE.Raycaster());
    const hitRightRef = useRef(new THREE.Vector3());
    const hitLeftRef = useRef(new THREE.Vector3());

    useFrame(() => {
      const perspective = camera as THREE.PerspectiveCamera;
      if (!perspective?.isPerspectiveCamera) return;
      const raycaster = raycasterRef.current;
      const plane = planeRef.current;
      const hitRight = hitRightRef.current;
      const hitLeft = hitLeftRef.current;
      const ndcY = 0;

      raycaster.setFromCamera(new THREE.Vector2(1, ndcY), perspective);
      const hasRight = raycaster.ray.intersectPlane(plane, hitRight);
      raycaster.setFromCamera(new THREE.Vector2(-1, ndcY), perspective);
      const hasLeft = raycaster.ray.intersectPlane(plane, hitLeft);

      if (!hasRight || !hasLeft) return;

      const span = Math.abs(hitRight.x - hitLeft.x);
      const worldPerPixel = span / Math.max(1, size.width);
      const maxPixelSpan = 180;
      const spanForContainer = Math.min(span * 0.6, maxPixelSpan * worldPerPixel);
      const worldBounds = Math.max(
        MIN_WALK_BOUNDS,
        spanForContainer / 2 - spanForContainer * WALK_PADDING_RATIO,
      );
      const nextBounds = USE_FIXED_CAMERA ? worldBounds / FIXED_MODEL_SCALE : worldBounds;
      if (Math.abs(boundsRef.current - nextBounds) > 0.001) {
        boundsRef.current = nextBounds;
        setBoundsX(nextBounds);
      }
    });

    return (
      <MindstormWalker ref={ref} isWalking={isWalking} wave={wave} onReady={onReady} boundsX={boundsX} />
    );
});

WalkerWithBounds.displayName = "WalkerWithBounds";

const MindstormScene = () => {
  const [walking, setWalking] = useState(false);
  const [wave, setWave] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const frameOffsetY = FRAME_OFFSET_Y;
  const frameOffsetX = 0;
  const modelScale = MODEL_SCALE;
  const fitPadding = FIT_PADDING;
  const [fitToken] = useState(0);
  const characterRef = useRef<THREE.Group | null>(null);

  const triggerWave = () => {
    setWave(true);
    window.setTimeout(() => setWave(false), 120);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Mindstorm avatar</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">Interactive character</h3>
          <p className="mt-2 text-sm text-slate-500">Toggle a walk loop or trigger a quick wave.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={walking ? "primary" : "secondary"} size="sm" onClick={() => setWalking((prev) => !prev)}>
            {walking ? "Stop walk" : "Start walk"}
          </Button>
          <Button variant="secondary" size="sm" onClick={triggerWave}>
            Wave
          </Button>
        </div>
      </div>
      <div className="mt-6 h-[440px] w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 md:h-[520px]">
        <Canvas orthographic camera={{ position: FIXED_CAMERA_POS, zoom: ORTHO_ZOOM }} dpr={[1, 1.75]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={null}>
            <Environment preset="studio" />
            {USE_FIXED_CAMERA ? (
              <group scale={FIXED_MODEL_SCALE} position={[0, 0, 0]}>
                <WalkerWithBounds
                  ref={characterRef}
                  isWalking={walking}
                  wave={wave}
                  onReady={() => setModelReady(true)}
                />
              </group>
            ) : (
              <WalkerWithBounds
                ref={characterRef}
                isWalking={walking}
                wave={wave}
                onReady={() => setModelReady(true)}
              />
            )}
          </Suspense>
          {USE_FIXED_CAMERA ? (
            <FixedCamera position={FIXED_CAMERA_POS} lookAt={FIXED_CAMERA_LOOK_AT} />
          ) : (
            <FitCamera
              targetRef={characterRef}
              ready={modelReady}
              fitToken={fitToken}
              frameOffsetY={frameOffsetY}
              frameOffsetX={frameOffsetX}
              modelScale={modelScale}
              fitPadding={fitPadding}
            />
          )}
        </Canvas>
      </div>
    </div>
  );
};

export default MindstormScene;
