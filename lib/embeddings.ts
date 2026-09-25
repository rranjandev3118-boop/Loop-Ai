const DIMENSIONS = 256;

function tokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function createEmbedding(value: string): number[] {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  for (const token of tokens(value)) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % DIMENSIONS] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) score += left[index] * right[index];
  return score;
}
