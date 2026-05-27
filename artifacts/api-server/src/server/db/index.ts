import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";

export { db, pool };

export async function validateDatabaseConnection(): Promise<"ok" | "error"> {
  try {
    await db.execute(sql`select 1`);
    return "ok";
  } catch {
    return "error";
  }
}
