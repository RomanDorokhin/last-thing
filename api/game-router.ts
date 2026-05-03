import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { scores } from "db/schema";
import { desc, asc, eq, sql } from "drizzle-orm";

export const gameRouter = createRouter({
  submitScore: publicQuery
    .input(
      z.object({
        playerName: z.string().min(1).max(50),
        totalTime: z.number().int().min(0),
        phase1Time: z.number().int().min(0).default(0),
        phase2Time: z.number().int().min(0).default(0),
        phase3Time: z.number().int().min(0).default(0),
        phase4Time: z.number().int().min(0).default(0),
        phase5Time: z.number().int().min(0).default(0),
        completed: z.enum(["true", "false"]).default("false"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(scores).values({
        playerName: input.playerName,
        totalTime: input.totalTime,
        phase1Time: input.phase1Time,
        phase2Time: input.phase2Time,
        phase3Time: input.phase3Time,
        phase4Time: input.phase4Time,
        phase5Time: input.phase5Time,
        completed: input.completed,
      });
      return { id: Number((result as unknown as { insertId: number }).insertId) };
    }),

  getLeaderboard: publicQuery
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select({
          id: scores.id,
          playerName: scores.playerName,
          totalTime: scores.totalTime,
          phase1Time: scores.phase1Time,
          phase2Time: scores.phase2Time,
          phase3Time: scores.phase3Time,
          phase4Time: scores.phase4Time,
          phase5Time: scores.phase5Time,
          completed: scores.completed,
          createdAt: scores.createdAt,
        })
        .from(scores)
        .where(eq(scores.completed, "true"))
        .orderBy(asc(scores.totalTime))
        .limit(input.limit);
      return results;
    }),

  getStats: publicQuery.query(async () => {
    const db = getDb();
    const totalPlayers = await db
      .select({ count: sql<number>`count(distinct ${scores.userId})` })
      .from(scores);
    const totalRuns = await db
      .select({ count: sql<number>`count(*)` })
      .from(scores);
    const completedRuns = await db
      .select({ count: sql<number>`count(*)` })
      .from(scores)
      .where(eq(scores.completed, "true"));
    return {
      totalPlayers: totalPlayers[0]?.count ?? 0,
      totalRuns: totalRuns[0]?.count ?? 0,
      completedRuns: completedRuns[0]?.count ?? 0,
    };
  }),
});
