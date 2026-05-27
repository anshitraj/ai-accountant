import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "path";
import { config } from "dotenv";

let current = process.cwd();
while (true) {
  const envPath = path.join(current, ".env");
  if (fs.existsSync(envPath)) {
    config({ path: envPath, quiet: true });
  }

  const parent = path.dirname(current);
  if (parent === current) break;
  current = parent;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/finverify.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
