import { cosineSimilarity } from "../apis/embedText";

export function getSemanticSearchResults(
  queryEmbedding: number[],
  cycles: { id: string; embedding?: number[] }[],
  threshold: number = 0.7
): string[] {
  const scored = cycles
    .filter((cycle) => Array.isArray(cycle.embedding))
    .map((cycle) => ({
      id: cycle.id,
      score: cosineSimilarity(queryEmbedding, cycle.embedding!),
    }));

  // Always return the highest scoring result, even if below threshold
  if (scored.length === 0) return [];
  const sorted = scored.sort((a, b) => b.score - a.score);
  return [sorted[0].id];
}
