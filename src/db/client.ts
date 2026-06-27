import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Neon serverless HTTP driver — one-shot queries over HTTP, which is what
 * suits ephemeral Vercel functions (no long-lived TCP pool, works on edge).
 * Drizzle sits on top and gives us typed queries.
 */
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
