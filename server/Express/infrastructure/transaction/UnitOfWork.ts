/**
 * UnitOfWork provider
 * --------------------
 * This file exposes a Unit of Work provider with two runners:
 * - tx(fn):    Execute a function within a single DB transaction.
 * - noTx(fn):  Execute a function without an explicit transaction.
 *
 * Each runner provides a set of repository instances (typed by domain interfaces)
 * that are bound to the appropriate DB connection/transaction context.
 *
 * Guidelines:
 * - Use tx for multi-step business flows that must be atomic (all-or-nothing).
 * - Use noTx for simple single-step reads/writes.
 * - Repositories should remain atomic (single SQL statement per method) and avoid
 *   orchestrating multi-step flows—this belongs in services using the UoW.
 *
 * Nested transactions:
 * - The DB adapters (SQLite/MySQL) are implemented so that nested withTransaction
 *   calls reuse the same transaction/connection instead of opening a new one.
 *   This prevents accidental double-transactions.
 */
import { CallbackDB } from "../adapters/callbackDb";
import { IDialect } from "../sql/dialect";
import { UsersRepo } from "../repos/UsersRepo";
import { RoomsRepo } from "../repos/RoomsRepo";
import { MessagesRepo } from "../repos/MessagesRepo";
import { SessionsRepo } from "../repos/SessionsRepo";
import { FriendsRepo } from "../repos/FriendsRepo";
import { IUserRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IUserRepo";
import { IRoomRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IRoomRepo";
import { IMessageRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IMessageRepo";
import { ISessionRepo } from "../../domain/interfaces/dbInterfaces/Irepos/ISessionRepo";
import { IFriendRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IFriendRepo";

export interface UnitOfWork {
  usersRepo: IUserRepo;
  roomsRepo: IRoomRepo;
  messagesRepo: IMessageRepo;
  sessionsRepo: ISessionRepo;
  friendsRepo: IFriendRepo;
}

export type UnitOfWorkRunner = <T>(fn: (uow: UnitOfWork) => Promise<T>) => Promise<T>;

export interface UnitOfWorkProvider {
  tx: UnitOfWorkRunner;    // transactional
  noTx: UnitOfWorkRunner;  // non-transactional
}

export function createUnitOfWork(db: CallbackDB, dialect: IDialect): UnitOfWorkProvider {
  const buildUow = (conn: CallbackDB): UnitOfWork => {
    const usersRepo = new UsersRepo(conn, dialect);
    const roomsRepo = new RoomsRepo(conn, dialect);
    const messagesRepo = new MessagesRepo(conn, dialect);
    const sessionsRepo = new SessionsRepo(conn, usersRepo as any, dialect);
    const friendsRepo = new FriendsRepo(conn, dialect);
    return { usersRepo, roomsRepo, messagesRepo, sessionsRepo, friendsRepo } as UnitOfWork;
  };

  const tx: UnitOfWorkRunner = async <T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> => {
    return db.withTransaction(async (txDb) => {
      const uow = buildUow(txDb);
      return fn(uow);
    });
  };

  const noTx: UnitOfWorkRunner = async <T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> => {
    const uow = buildUow(db);
    return fn(uow);
  };

  return { tx, noTx };
}
