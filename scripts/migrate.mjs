import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envRoot = resolve(root, ".env");
const envPrisma = resolve(root, "prisma", ".env");

if (existsSync(envRoot)) config({ path: envRoot });
if (existsSync(envPrisma)) config({ path: envPrisma });

if (!process.env.DATABASE_URL) {
  console.error("");
  console.error("ERROR: DATABASE_URL is missing.");
  console.error("Create a file named .env in the project root (next to package.json) with:");
  console.error('  DATABASE_URL="postgresql://..."');
  console.error("Or also put the same file in prisma/.env");
  console.error("");
  process.exit(1);
}

console.log("DATABASE_URL found. Running prisma migrate...");
const result = spawnSync(
  "npx",
  ["prisma", "migrate", "dev", "--name", "init"],
  { stdio: "inherit", cwd: root, shell: true, env: process.env }
);
process.exit(result.status ?? 1);
