import { IDialect } from "./dialect";

export type InsertOptions = {
  returningId?: boolean;
};

export type SelectOptions = {
  where?: string;
  orderBy?: string;
  limit?: number;
  groupBy?: string;
};

export function buildInsert(
  dialect: IDialect,
  table: string,
  columns: string[],
  opts?: InsertOptions
): string {
  let sql = dialect.buildInsert(table, columns);
  if (opts?.returningId && dialect.hasReturningId()) {
    sql += dialect.returningIdFragment();
  }
  return sql;
}

export function buildInsertOrIgnore(
  dialect: IDialect,
  table: string,
  columns: string[],
  conflictColumns?: string[]
): string {
  return dialect.buildInsertOrIgnore(table, columns, conflictColumns);
}

export function buildUpsertOnId(
  dialect: IDialect,
  table: string,
  columns: string[],
  updateColumns: string[]
): string {
  return dialect.buildUpsertOnId(table, columns, updateColumns);
}

export function visibilityPredicate(dialect: IDialect, column: string): string {
  return dialect.visibilityPredicate(column);
}

// New helpers aligned with IDialect
export function buildSelect(
  dialect: IDialect,
  table: string,
  columns: string[] = ["*"],
  opts?: SelectOptions
): string {
  return dialect.buildSelect(
    table,
    columns,
    opts?.where,
    opts?.orderBy,
    opts?.limit,
    opts?.groupBy
  );
}

export function buildUpdate(
  dialect: IDialect,
  table: string,
  setColumns: string[],
  where: string
): string {
  return dialect.buildUpdate(table, setColumns, where);
}

export function buildUpdateParts(
  dialect: IDialect,
  table: string,
  setParts: string[],
  where: string
): string {
  return dialect.buildUpdateParts(table, setParts, where);
}

export function buildDelete(
  dialect: IDialect,
  table: string,
  where: string
): string {
  return dialect.buildDelete(table, where);
}

export function buildLikePredicate(
  dialect: IDialect,
  column: string,
  caseInsensitive = false,
  withEscape = true
): string {
  return dialect.buildLike(column, caseInsensitive, withEscape);
}

export function prepareLikeParam(
  dialect: IDialect,
  value: string,
  mode: "contains" | "startsWith" | "endsWith" | "exact" = "contains",
  caseInsensitive = false
): string {
  return dialect.prepareLikeParam(value, mode, caseInsensitive);
}

export function escapeLike(dialect: IDialect, raw: string): string {
  return dialect.escapeLike(raw);
}
