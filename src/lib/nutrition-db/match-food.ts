import { iranianFoods, type LocalFood } from "./iranian-foods";

function normalizeFoodName(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchIranianFood(name: string): LocalFood | undefined {
  const normalizedName = normalizeFoodName(name);
  if (!normalizedName) return undefined;

  return iranianFoods.find((food) => [food.name, ...food.aliases].some((candidate) => {
    const normalizedCandidate = normalizeFoodName(candidate);
    return normalizedName === normalizedCandidate || normalizedName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedName);
  }));
}
