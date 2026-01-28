import { Float, Html } from "@react-three/drei";
import Button from "../ui/Button";
import ConnectionsGraph from "../features/ConnectionsGraph";
import PatternStream from "../features/PatternStream";
import LifeBalanceCompass from "../features/LifeBalanceCompass";
import type { ConnectionEdge, ConnectionNode } from "../../types/connections";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { JournalEntry } from "../../types/journal";

const ToonMaterial = ({ color }: { color: string }) => (
  <meshToonMaterial color={color} gradientMap={null} />
);

type ConstellationTotemProps = {
  active: boolean;
  detail: boolean;
  onEnter: () => void;
  onDeepDive: () => void;
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  onEdgeSelect: (edge: ConnectionEdge) => void;
  selectedEdgeId?: string;
};

export const ConstellationTotem = ({
  active,
  detail,
  onEnter,
  onDeepDive,
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
        <ToonMaterial color="#94a3b8" />
      </mesh>
      {!active && (
        <Float speed={4} rotationIntensity={0} floatIntensity={1} position={[0, 2.5, 0]}>
          <mesh>
            <coneGeometry args={[0.12, 0.36, 4]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        </Float>
      )}
      {!active && (
        <Html position={[0, 1.2, 0]} center distanceFactor={6} pointerEvents="none">
          <div className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            CONTEXT
          </div>
        </Html>
      )}
      {active && !detail && (
        <Html position={[0.5, 0.6, 0]} center distanceFactor={5} pointerEvents="auto">
          <div
            className="pointer-events-auto w-64 rounded-2xl border border-white/60 bg-white/90 p-4 text-left shadow-xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800">My Context</h3>
            <p className="mt-1 text-xs text-slate-600">
              External factors, routines, and stressors shaping your recent mood.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeepDive();
                }}
                className="w-full text-xs"
              >
                Explore patterns →
              </Button>
            </div>
          </div>
        </Html>
      )}
      {active && detail && (
        <Html transform position={[0.6, 0.4, 0]} distanceFactor={3} pointerEvents="auto">
          <div
            className="pointer-events-auto w-[520px] rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-700">Context web</h3>
            <ConnectionsGraph
              nodes={nodes}
              edges={edges}
              onEdgeSelect={onEdgeSelect}
              selectedEdgeId={selectedEdgeId}
              loading={false}
              emptyState={!nodes.length}
            />
          </div>
        </Html>
      )}
    </group>
  );
};

type SymptomTotemProps = {
  active: boolean;
  detail: boolean;
  onEnter: () => void;
  onDeepDive: () => void;
  series: ThemeSeries[];
};

export const SymptomTotem = ({ active, detail, onEnter, onDeepDive, series }: SymptomTotemProps) => {
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
          <ToonMaterial color="#818cf8" />
        </mesh>
      </Float>
      {!active && (
        <Float speed={4} rotationIntensity={0} floatIntensity={1} position={[0, 2.5, 0]}>
          <mesh>
            <coneGeometry args={[0.12, 0.36, 4]} />
            <meshBasicMaterial color="#818cf8" />
          </mesh>
        </Float>
      )}
      {!active && (
        <Html position={[0, 1.4, 0]} center distanceFactor={6} pointerEvents="none">
          <div className="rounded-full bg-indigo-600/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            FEELINGS
          </div>
        </Html>
      )}
      {active && !detail && (
        <Html position={[0, 0.8, 0]} center distanceFactor={5} pointerEvents="auto">
          <div
            className="pointer-events-auto w-64 rounded-2xl border border-white/60 bg-white/90 p-4 text-left shadow-xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800">My Feelings</h3>
            <p className="mt-1 text-xs text-slate-600">
              Recent emotional weather and short-term fluctuations you can explore.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeepDive();
                }}
                className="w-full text-xs"
              >
                Explore patterns →
              </Button>
            </div>
          </div>
        </Html>
      )}
      {active && detail && (
        <Html transform position={[0, 0.4, 0]} distanceFactor={4} pointerEvents="auto">
          <div
            className="pointer-events-auto w-[640px] rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Emotional weather</div>
            <div className="mt-3">
              <PatternStream series={series} />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

type ImpactTotemProps = {
  active: boolean;
  detail: boolean;
  onEnter: () => void;
  onDeepDive: () => void;
  entries: JournalEntry[];
};

export const ImpactTotem = ({ active, detail, onEnter, onDeepDive, entries }: ImpactTotemProps) => {
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
        <ToonMaterial color="#fb923c" />
      </mesh>
      {!active && (
        <Float speed={4} rotationIntensity={0} floatIntensity={1} position={[0, 2.5, 0]}>
          <mesh>
            <coneGeometry args={[0.12, 0.36, 4]} />
            <meshBasicMaterial color="#fb923c" />
          </mesh>
        </Float>
      )}
      {!active && (
        <Html position={[0, 1.2, 0]} center distanceFactor={6} pointerEvents="none">
          <div className="rounded-full bg-orange-600/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            IMPACT
          </div>
        </Html>
      )}
      {active && !detail && (
        <Html position={[0, 0.6, 0]} center distanceFactor={5} pointerEvents="auto">
          <div
            className="pointer-events-auto w-64 rounded-2xl border border-white/60 bg-white/90 p-4 text-left shadow-xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800">My Life</h3>
            <p className="mt-1 text-xs text-slate-600">
              How your routines and balance are shifting day-to-day.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeepDive();
                }}
                className="w-full text-xs"
              >
                Explore patterns →
              </Button>
            </div>
          </div>
        </Html>
      )}
      {active && detail && (
        <Html transform position={[0, 0.2, 0]} distanceFactor={3} pointerEvents="auto">
          <div
            className="pointer-events-auto flex h-[420px] w-[420px] items-center justify-center rounded-3xl border border-orange-100 bg-white/90 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <LifeBalanceCompass entries={entries} />
          </div>
        </Html>
      )}
    </group>
  );
};
