import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const global_ = globalThis as unknown as { db?: PrismaClient };

function crear() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db = global_.db ?? crear();
if (process.env.NODE_ENV !== "production") global_.db = db;
