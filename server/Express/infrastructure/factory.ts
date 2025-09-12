import {
  CallbackDB,
  createSqliteCallbackDb,
  createMysqlCallbackDb,
} from "./adapters";
import { Logger } from "../utils/LoggerUtil";
import { initializeSchema } from "./migrations/initializeSchema";

export type SupportedDBDrivers = "sqlite" | "mariadb" | "mysql";
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
    case "mariadb":
      {
        // Expected env vars for MariaDB
        const host = env.MARIADB_HOST as string;
        const port = Number(env.MARIADB_PORT);
        const database = env.MARIADB_DB as string;
        const user = env.MARIADB_USER as string;
        const password = env.MARIADB_PASSWORD as string;
        const ssl = String(env.MARIADB_SSL).toLowerCase() === "true";
        Logger.info(
          `DatabaseFactory MariaDB -> host=${host} port=${port} db=${database} user=${user} ssl=${ssl}`
        );
        const db = createMysqlCallbackDb({
          host,
          port,
          database,
          user,
          password,
          ssl,
        });
        initializeSchema(db, "mariadb");
        return db;
      }
    case "mysql": {
      // Expected env vars for MySQL/MariaDB
      const host = env.MYSQL_HOST as string;
      const port = Number(env.MYSQL_PORT);
      const database = env.MYSQL_DB as string;
      const user = env.MYSQL_USER as string;
      const password = env.MYSQL_PASSWORD as string;
      const ssl = String(env.MYSQL_SSL).toLowerCase() === "true";
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
