import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// dotenv/config čte .env — ale my máme credentials v .env.local (Next.js konvence)
config({ path: ".env.local" });

// Supabase vyžaduje SSL na portu 5432. Přidáme parametr do URL programaticky,
// aby nebylo nutné měnit .env.local.
const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "require");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  // Omezíme introspekci jen na public schema — Supabase má v auth/storage
  // schématech CHECK constraints ve formátu, který drizzle-kit neumí parsovat.
  schemaFilter: ["public"],
  dbCredentials: {
    url: dbUrl.toString(),
  },
} satisfies Config;