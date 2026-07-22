import { prisma } from "@/lib/prisma";

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type RatingStats = {
  /** Average stars. 0 when there are no ratings — callers must check `count`. */
  average: number;
  /** Total number of ratings/reviews. 0 means "Not Rated Yet". */
  count: number;
  /** Count of ratings per star bucket (1..5). */
  distribution: RatingDistribution;
};

export function emptyRatingStats(): RatingStats {
  return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

function buildStats(rows: { stars: number; _count: { stars: number } }[]): RatingStats {
  const stats = emptyRatingStats();
  let total = 0;
  let weighted = 0;

  for (const row of rows) {
    const bucket = row.stars as 1 | 2 | 3 | 4 | 5;
    const c = row._count.stars;
    stats.distribution[bucket] = c;
    total += c;
    weighted += bucket * c;
  }

  stats.count = total;
  stats.average = total > 0 ? weighted / total : 0;
  return stats;
}

/**
 * Aggregates rating stats (average, count, per-star distribution) for every
 * food in one query. Returns a Map keyed by foodId; foods with no ratings are
 * simply absent (callers should fall back to `emptyRatingStats()`).
 *
 * This is the single source of truth for rating aggregation across the app.
 */
export async function getFoodRatingStatsMap(): Promise<Map<string, RatingStats>> {
  const grouped = await prisma.rating.groupBy({
    by: ["foodId", "stars"],
    _count: { stars: true },
  });

  const byFood = new Map<string, { stars: number; _count: { stars: number } }[]>();
  for (const row of grouped) {
    if (row.foodId === null) continue;
    const list = byFood.get(row.foodId) ?? [];
    list.push({ stars: row.stars, _count: { stars: row._count.stars } });
    byFood.set(row.foodId, list);
  }

  const result = new Map<string, RatingStats>();
  for (const [foodId, rows] of byFood) {
    result.set(foodId, buildStats(rows));
  }
  return result;
}

/**
 * Aggregates rating stats for a single food.
 */
export async function getFoodRatingStats(foodId: string): Promise<RatingStats> {
  const grouped = await prisma.rating.groupBy({
    by: ["stars"],
    where: { foodId },
    _count: { stars: true },
  });

  return buildStats(grouped.map((r) => ({ stars: r.stars, _count: { stars: r._count.stars } })));
}
