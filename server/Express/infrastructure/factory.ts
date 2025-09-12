import {
  CallbackDB,
  createSqliteCallbackDb,
  createMysqlCallbackDb,
} from "./adapters";
import { Logger } from "../utils/LoggerUtil";
import { initializeSchema } from "./migrations/initializeSchema";

export type SupportedDBDrivers = "sqlite" | "mysql";
const DRIVER: SupportedDBDrivers = process.env
  .DATABASE_DRIVER as SupportedDBDrivers;

export interface DbFactoryOptions {
  driver?: SupportedDBDrivers;
  sqliteFile?: string;
}

export function createCallbackDbFromEnv(
  env: NodeJS.ProcessEnv = process.env
): CallbackDB {
  const driver = (DRIVER as string).toLowerCase() as SupportedDBDrivers;
  Logger.info(`DatabaseFactory using driver: ${driver}`);
  switch (driver) {
    case "sqlite": {
      const file = env.SQLITE_FILE as string;
      if (!file) {
        throw new Error("Database file path is required");
      }
      Logger.info(`DatabaseFactory using SQLite file: ${file}`);
      const db = createSqliteCallbackDb(file);
      initializeSchema(db, "sqlite");
      return db;
    }
    case "mysql": {
      // Expected env vars for MySQL/MariaDB
      const host = env.MYSQL_HOST || "mysql";
      const port = Number(env.MYSQL_PORT || 3306);
      const database = env.MYSQL_DB || "chat";
      const user = env.MYSQL_USER || "chat";
      const password = env.MYSQL_PASSWORD || "";
      const ssl = String(env.MYSQL_SSL || "false").toLowerCase() === "true";
      Logger.info(
        `DatabaseFactory MySQL -> host=${host} port=${port} db=${database} user=${user} ssl=${ssl}`
      );
      const db = createMysqlCallbackDb({
        host,
        port,
        database,
        user,
        password,
        ssl,
      });
      initializeSchema(db, "mysql");
      return db;
    }
    default:
      throw new Error(`Unsupported DATABASE_DRIVER: ${driver}`);
  }
}
