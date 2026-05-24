import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Vytváříme jeden sdílený postgres klient pro celou aplikaci.
// postgres() přijme connection string a interně spravuje connection pool.
const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });
