/**
 * Small dependency-free Random Forest for tabular financial features.
 *
 * Each leaf keeps three statistics of the training returns that landed in it:
 *   mean return, share positive, share above the target return.
 * One forest therefore serves all three prediction targets in the spec without
 * training three separate models.
 *
 * Pure math only — safe to import anywhere.
 */

export interface ForestParams {
  trees: number;
  maxDepth: number;
  minSamplesLeaf: number;
  featureFraction: number;
  sampleFraction: number;
  seed: number;
  /** Return (%) that counts as "hit the target" for prob_target. */
  targetReturnPct: number;
}

export const DEFAULT_FOREST_PARAMS: ForestParams = {
  trees: 60,
  maxDepth: 8,
  minSamplesLeaf: 12,
  featureFraction: 0.6,
  sampleFraction: 0.8,
  seed: 20260811,
  targetReturnPct: 1,
};

export interface Leaf {
  mean: number;
  posShare: number;
  targetShare: number;
  n: number;
}

interface Node {
  feature?: number;
  threshold?: number;
  left?: Node;
  right?: Node;
  leaf?: Leaf;
}

export interface Prediction {
  predicted_return: number;
  prob_positive: number;
  prob_target: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function leafOf(y: number[], idx: number[], targetReturnPct: number): Leaf {
  let sum = 0;
  let pos = 0;
  let hit = 0;
  for (const i of idx) {
    const v = y[i]!;
    sum += v;
    if (v > 0) pos += 1;
    if (v >= targetReturnPct) hit += 1;
  }
  const n = idx.length || 1;
  return { mean: sum / n, posShare: pos / n, targetShare: hit / n, n: idx.length };
}

function variance(y: number[], idx: number[]): number {
  if (idx.length < 2) return 0;
  let sum = 0;
  for (const i of idx) sum += y[i]!;
  const m = sum / idx.length;
  let acc = 0;
  for (const i of idx) acc += (y[i]! - m) ** 2;
  return acc / idx.length;
}

function candidateThresholds(x: number[][], idx: number[], feature: number, rand: () => number) {
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(idx.length / 40));
  for (let i = Math.floor(rand() * step); i < idx.length; i += step) {
    sample.push(x[idx[i]!]![feature]!);
  }
  sample.sort((a, b) => a - b);
  const out: number[] = [];
  for (const q of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const v = sample[Math.floor(q * (sample.length - 1))];
    if (v !== undefined && !out.includes(v)) out.push(v);
  }
  return out;
}

function buildTree(
  x: number[][],
  y: number[],
  idx: number[],
  depth: number,
  params: ForestParams,
  rand: () => number,
): Node {
  if (depth >= params.maxDepth || idx.length < params.minSamplesLeaf * 2) {
    return { leaf: leafOf(y, idx, params.targetReturnPct) };
  }

  const featureCount = x[0]?.length ?? 0;
  const tryCount = Math.max(1, Math.round(featureCount * params.featureFraction));
  const parentVar = variance(y, idx);
  let best: { feature: number; threshold: number; gain: number; left: number[]; right: number[] } | null =
    null;

  for (let t = 0; t < tryCount; t++) {
    const feature = Math.floor(rand() * featureCount);
    for (const threshold of candidateThresholds(x, idx, feature, rand)) {
      const left: number[] = [];
      const right: number[] = [];
      for (const i of idx) (x[i]![feature]! <= threshold ? left : right).push(i);
      if (left.length < params.minSamplesLeaf || right.length < params.minSamplesLeaf) continue;
      const weighted =
        (left.length * variance(y, left) + right.length * variance(y, right)) / idx.length;
      const gain = parentVar - weighted;
      if (gain > 0 && (!best || gain > best.gain)) best = { feature, threshold, gain, left, right };
    }
  }

  if (!best) return { leaf: leafOf(y, idx, params.targetReturnPct) };

  return {
    feature: best.feature,
    threshold: best.threshold,
    left: buildTree(x, y, best.left, depth + 1, params, rand),
    right: buildTree(x, y, best.right, depth + 1, params, rand),
  };
}

function importanceOf(node: Node, out: number[], total: { value: number }, samples: number) {
  if (!node.left || !node.right || node.feature === undefined) return;
  const weight = samples;
  out[node.feature] = (out[node.feature] ?? 0) + weight;
  total.value += weight;
  const leftN = node.left.leaf?.n ?? Math.floor(samples / 2);
  const rightN = node.right.leaf?.n ?? Math.ceil(samples / 2);
  importanceOf(node.left, out, total, leftN);
  importanceOf(node.right, out, total, rightN);
}

export interface Forest {
  trees: Node[];
  params: ForestParams;
  importance: number[];
  trainRows: number;
}

export function trainForest(x: number[][], y: number[], params: ForestParams): Forest {
  const rand = mulberry32(params.seed);
  const trees: Node[] = [];
  const featureCount = x[0]?.length ?? 0;
  const importance = new Array(featureCount).fill(0);
  const total = { value: 0 };
  const bagSize = Math.max(params.minSamplesLeaf * 4, Math.round(x.length * params.sampleFraction));

  for (let t = 0; t < params.trees; t++) {
    const idx: number[] = [];
    for (let i = 0; i < bagSize; i++) idx.push(Math.floor(rand() * x.length));
    const tree = buildTree(x, y, idx, 0, { ...params, seed: params.seed + t }, rand);
    trees.push(tree);
    importanceOf(tree, importance, total, idx.length);
  }

  const normalized = importance.map((v) => (total.value > 0 ? v / total.value : 0));
  return { trees, params, importance: normalized, trainRows: x.length };
}

function predictTree(node: Node, row: number[]): Leaf {
  let current = node;
  while (!current.leaf) {
    const feature = current.feature!;
    current = row[feature]! <= current.threshold! ? current.left! : current.right!;
  }
  return current.leaf;
}

export function predictForest(forest: Forest, row: number[]): Prediction {
  let mean = 0;
  let pos = 0;
  let hit = 0;
  for (const tree of forest.trees) {
    const leaf = predictTree(tree, row);
    mean += leaf.mean;
    pos += leaf.posShare;
    hit += leaf.targetShare;
  }
  const n = forest.trees.length || 1;
  return {
    predicted_return: mean / n,
    prob_positive: pos / n,
    prob_target: hit / n,
  };
}
