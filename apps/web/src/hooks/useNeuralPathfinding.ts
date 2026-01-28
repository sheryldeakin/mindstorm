import { useCallback, useMemo } from "react";

type Edge = { from: string; to: string };
export type NeuralPath = string[];

type NeuralPathfinding = {
  findPaths: (start: string, end: string, maxDepth?: number) => NeuralPath[];
};

export const useNeuralPathfinding = (edges: Edge[]): NeuralPathfinding => {
  const adjacency = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!map.has(edge.from)) map.set(edge.from, []);
      map.get(edge.from)!.push(edge.to);
    });
    return map;
  }, [edges]);

  const findPaths = useCallback(
    (start: string, end: string, maxDepth = 6) => {
      const validPaths: NeuralPath[] = [];

      const dfs = (current: string, path: string[], visited: Set<string>) => {
        if (current === end && path.length > 1) {
          validPaths.push(path);
          return;
        }

        if (path.length >= maxDepth) return;

        const neighbors = adjacency.get(current) ?? [];
        for (const next of neighbors) {
          if (next === start && end === start) {
            validPaths.push([...path, next]);
          } else if (!visited.has(next)) {
            visited.add(next);
            dfs(next, [...path, next], visited);
            visited.delete(next);
          }
        }
      };

      dfs(start, [start], new Set([start]));
      return validPaths.sort((a, b) => a.length - b.length);
    },
    [adjacency],
  );

  return { findPaths };
};
