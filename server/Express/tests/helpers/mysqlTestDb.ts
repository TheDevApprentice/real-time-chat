import { createMysqlCallbackDb } from "../../infrastructure/adapters/mysqlCallbackDb";
import type { CallbackDB } from "../../infrastructure/adapters/callbackDb";
// import { initializeSchema } from "../../infrastructure/migrations/initializeSchema";
import { Logger } from "../../utils/LoggerUtil";
require("@dotenvx/dotenvx").config();
export type MysqlTestConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
};

export function getEnvConfig(): MysqlTestConfig {
  const host = "127.0.0.1";
  const port = Number(process.env.MARIADB_PORT);
  const database = process.env.MARIADB_DB;
  const user = process.env.MARIADB_USER;
  const password = process.env.MARIADB_PASSWORD;
  const ssl = String(process.env.MARIADB_SSL).toLowerCase() === "true";
  if (!host || !port || !database || !user || !password) {
    throw new Error("Missing required environment variables for MySQL test DB");
  }
  return { host, port, database, user, password, ssl };
}

export async function createMysqlTestDb(config: MysqlTestConfig = getEnvConfig()): Promise<CallbackDB> {
  Logger.info(`[tests] Creating MySQL test DB connection to ${config.user}@${config.host}:${config.port}/${config.database} ssl=${config.ssl}`);
  const db = createMysqlCallbackDb(config);
  // Schema is already initialized by the environment; no DDL here to avoid side-effects.
  return db;
}

export async function clearMysqlTestDb(config: MysqlTestConfig = getEnvConfig()): Promise<void> {
  const db = createMysqlCallbackDb(config);
  await clearUsingDb(db);
  await new Promise<void>((resolve) => db.close(() => resolve()));
}

export async function clearUsingDb(db: CallbackDB): Promise<void> {
  // Disable FK checks to allow truncation order without errors
  await new Promise<void>((resolve) => db.run("SET FOREIGN_KEY_CHECKS=0", undefined, () => resolve()));
  // Delete children before parents to keep logs/referential order sane
  await new Promise<void>((resolve) => db.run("DELETE FROM messages", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("DELETE FROM user_rooms", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("DELETE FROM friends", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("DELETE FROM user_sessions", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("DELETE FROM rooms", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("DELETE FROM users", undefined, () => resolve()));
  await new Promise<void>((resolve) => db.run("SET FOREIGN_KEY_CHECKS=1", undefined, () => resolve()));
}

