import { createMysqlTestDb } from "./mysqlTestDb";
import { createUnitOfWork } from "../../infrastructure/transaction/UnitOfWork";
import { createDialect } from "../../infrastructure/sql/dialect";
import type { UnitOfWorkProvider } from "../../infrastructure/transaction/UnitOfWork";
import type { CallbackDB } from "../../infrastructure/adapters/callbackDb";

export type TestUowHandle = {
  db: CallbackDB;
  uow: UnitOfWorkProvider;
  close: () => Promise<void>;
};

export async function createTestUow(): Promise<TestUowHandle> {
  const db = await createMysqlTestDb();
  const dialect = createDialect();
  const uow = createUnitOfWork(db, dialect);
  const close = async () => new Promise<void>((resolve) => db.close(() => resolve()));
  return { db, uow, close };
}
