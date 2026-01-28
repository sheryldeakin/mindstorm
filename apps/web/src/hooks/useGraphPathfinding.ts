import { useCallback, useMemo } from "react";

type Edge = { from: string; to: string; weight?: number };
export type GraphPath = string[];

type GraphPathfinding = {
  findCyclesForNode: (startNode: string, maxDepth?: number) => GraphPath[];
  findPathsBetween: (start: string, end: string, maxDepth?: number) => GraphPath[];
};

export const useGraphPathfinding = (edges: Edge[]): GraphPathfinding => {
  const adjacency = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!map.has(edge.from)) map.set(edge.from, []);
      map.get(edge.from)!.push(edge.to);
    });
    return map;
  }, [edges]);

  const findCyclesForNode = useCallback(
    (startNode: string, maxDepth = 6) => {
      const cycles: GraphPath[] = [];
      const dfs = (current: string, path: string[], visited: Set<string>) => {
        const neighbors = adjacency.get(current) ?? [];
        for (const next of neighbors) {
          if (next === startNode) {
            cycles.push([...path, next]);
          } else if (!visited.has(next) && path.length < maxDepth) {
            visited.add(next);
            dfs(next, [...path, next], visited);
            visited.delete(next);
          }
        }
      };

      dfs(startNode, [startNode], new Set([startNode]));
      return cycles.sort((a, b) => a.length - b.length);
    },
    [adjacency],
  );

  const findPathsBetween = useCallback(
    (start: string, end: string, maxDepth = 6) => {
      const paths: GraphPath[] = [];
      const dfs = (current: string, path: string[], visited: Set<string>) => {
        if (current === end) {
          paths.push(path);
          return;
        }
        const neighbors = adjacency.get(current) ?? [];
        for (const next of neighbors) {
          if (!visited.has(next) && path.length < maxDepth) {
            visited.add(next);
            dfs(next, [...path, next], visited);
            visited.delete(next);
          }
        }
      };

      dfs(start, [start], new Set([start]));
      return paths.sort((a, b) => b.length - a.length);
    },
    [adjacency],
  );

  return { findCyclesForNode, findPathsBetween };
};
