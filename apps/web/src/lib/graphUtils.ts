type Edge = { from: string; to: string; weight: number };

const isSubLoop = (parent: string[], child: string[]) => {
  const parentSet = new Set(parent);
  if (!child.every((node) => parentSet.has(node))) return false;
  return child.length < parent.length;
};

export const findSimpleCycles = (edges: Edge[]) => {
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)?.push(edge.to);
  });

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (node: string, start: string) => {
    visited.add(node);
    stack.push(node);

    const neighbors = adjacency.get(node) ?? [];
    neighbors.forEach((neighbor) => {
      if (neighbor === start && stack.length > 1) {
        cycles.push([...stack]);
      } else if (!visited.has(neighbor) && !stack.includes(neighbor)) {
        dfs(neighbor, start);
      }
    });

    stack.pop();
    visited.delete(node);
  };

  Array.from(adjacency.keys()).forEach((node) => dfs(node, node));

  const unique: string[][] = [];
  const signatures = new Set<string>();
  cycles.forEach((cycle) => {
    const signature = [...cycle].sort().join("|");
    if (signatures.has(signature)) return;
    signatures.add(signature);
    unique.push(cycle);
  });

  return unique;
};

export const consolidateCycles = (allCycles: string[][]) => {
  const sorted = [...allCycles].sort((a, b) => b.length - a.length);
  const groups: { parent: string[]; subLoops: string[][] }[] = [];
  const processed = new Set<string>();

  sorted.forEach((cycle) => {
    const key = cycle.join("|");
    if (processed.has(key)) return;

    const subLoops: string[][] = [];
    sorted.forEach((other) => {
      const otherKey = other.join("|");
      if (key === otherKey || processed.has(otherKey)) return;
      if (isSubLoop(cycle, other)) {
        subLoops.push(other);
        processed.add(otherKey);
      }
    });

    groups.push({ parent: cycle, subLoops });
    processed.add(key);
  });

  return groups;
};

export const findAttachments = (cycleNodes: string[], edges: Edge[]) => {
  const cycleSet = new Set(cycleNodes);
  const inputs = new Set<string>();
  const outputs = new Set<string>();

  edges.forEach((edge) => {
    if (cycleSet.has(edge.to) && !cycleSet.has(edge.from)) {
      inputs.add(edge.from);
    }
    if (cycleSet.has(edge.from) && !cycleSet.has(edge.to)) {
      outputs.add(edge.to);
    }
  });

  return {
    inputs: Array.from(inputs),
    outputs: Array.from(outputs),
  };
};
