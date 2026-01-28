import { Float, Html, MeshTransmissionMaterial } from "@react-three/drei";
import ConnectionsGraph from "../features/ConnectionsGraph";
import PatternStream from "../features/PatternStream";
import LifeBalanceCompass from "../features/LifeBalanceCompass";
import type { ConnectionEdge, ConnectionNode } from "../../types/connections";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { JournalEntry } from "../../types/journal";

const GlassMaterial = ({ color }: { color: string }) => (
  <MeshTransmissionMaterial
    backside
    thickness={0.25}
    roughness={0.12}
    transmission={0.9}
    ior={1.4}
    chromaticAberration={0.08}
    color={color}
  />
);

type ConstellationTotemProps = {
  active: boolean;
  onEnter: () => void;
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  onEdgeSelect: (edge: ConnectionEdge) => void;
  selectedEdgeId?: string;
};

export const ConstellationTotem = ({
  active,
  onEnter,
  nodes,
  edges,
  onEdgeSelect,
  selectedEdgeId,
}: ConstellationTotemProps) => {
  return (
    <group position={[-4, 1.5, -3]}>
      <mesh
        visible={!active}
        onClick={onEnter}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <icosahedronGeometry args={[0.9, 0]} />
        <GlassMaterial color="#94a3b8" />
      </mesh>
      {!active && (
        <Html position={[0, 1.2, 0]} center distanceFactor={6}>
          <div className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            CONTEXT
          </div>
        </Html>
      )}
      {active && (
        <Html transform position={[0.6, 0.4, 0]} distanceFactor={3}>
          <div className="w-[520px] rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-slate-700">Context web</h3>
            <ConnectionsGraph
              nodes={nodes}
              edges={edges}
              onEdgeSelect={onEdgeSelect}
              selectedEdgeId={selectedEdgeId}
              loading={false}
              emptyState={!nodes.length}
            />
            <button onClick={onEnter} className="mt-3 text-xs text-slate-500 underline">
              Back to view
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};

type SymptomTotemProps = {
  active: boolean;
  onEnter: () => void;
  series: ThemeSeries[];
};

export const SymptomTotem = ({ active, onEnter, series }: SymptomTotemProps) => {
  return (
    <group position={[0, 2, -5]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh
          visible={!active}
          onClick={onEnter}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[0.95, 32, 32]} />
          <GlassMaterial color="#818cf8" />
        </mesh>
      </Float>
      {!active && (
        <Html position={[0, 1.4, 0]} center distanceFactor={6}>
          <div className="rounded-full bg-indigo-600/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            FEELINGS
          </div>
        </Html>
      )}
      {active && (
        <Html transform position={[0, 0.4, 0]} distanceFactor={4}>
          <div className="w-[640px] rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Emotional weather</div>
            <div className="mt-3">
              <PatternStream series={series} />
            </div>
            <button onClick={onEnter} className="mt-3 text-xs text-slate-500 underline">
              Back to view
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};

type ImpactTotemProps = {
  active: boolean;
  onEnter: () => void;
  entries: JournalEntry[];
};

export const ImpactTotem = ({ active, onEnter, entries }: ImpactTotemProps) => {
  return (
    <group position={[4, 1, -3]}>
      <mesh
        visible={!active}
        rotation={[0, 0.5, 0]}
        onClick={onEnter}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[1, 1.5, 1]} />
        <GlassMaterial color="#fb923c" />
      </mesh>
      {!active && (
        <Html position={[0, 1.2, 0]} center distanceFactor={6}>
          <div className="rounded-full bg-orange-600/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            IMPACT
          </div>
        </Html>
      )}
      {active && (
        <Html transform position={[0, 0.2, 0]} distanceFactor={3}>
          <div className="flex h-[420px] w-[420px] items-center justify-center rounded-3xl border border-orange-100 bg-white/90 shadow-2xl">
            <LifeBalanceCompass entries={entries} />
          </div>
          <button onClick={onEnter} className="mt-3 text-xs text-slate-500 underline">
            Back to view
          </button>
        </Html>
      )}
    </group>
  );
};
