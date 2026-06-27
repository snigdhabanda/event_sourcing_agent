import { defineConfig } from "drizzle-kit";

// drizzle-kit reads DATABASE_URL from the environment (it auto-loads .env).
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
