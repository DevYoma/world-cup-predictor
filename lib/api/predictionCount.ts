import { Elysia } from "elysia";
import { db } from "../db";
import { predictions } from "../db/schema";
import { sql } from "drizzle-orm";

export const statsPlugin = new Elysia()

  // GET /api/stats — returns total predictions count across all users
  .get("/stats", async () => {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(predictions);

    return { totalPredictions: Number(result?.count ?? 0) };
  });
