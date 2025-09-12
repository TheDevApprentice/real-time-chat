import { SupportedDrivers } from "../factory";

export interface IDialect {
  name: SupportedDrivers;
  // Convert a boolean to a parameter value the DB expects (e.g., 1/0 for sqlite/mysql, true/false for postgres)
  boolParam(value: boolean): any;
  // Return a WHERE predicate for visibility checks on boolean-like columns
  visibilityPredicate(column: string): string; // e.g. "column = TRUE" or "column = 1"
  // LIKE helpers
  buildLike(column: string, caseInsensitive?: boolean, withEscape?: boolean): string; // returns predicate using ? param, optionally with ESCAPE '\\'
  prepareLikeParam(value: string, mode?: "contains" | "startsWith" | "endsWith" | "exact", caseInsensitive?: boolean): string;
  escapeLike(raw: string): string; // escape % and _ with backslash
  // Basic insert builder
  buildInsert(table: string, columns: string[]): string; // INSERT INTO table (c1,c2,...) VALUES (?,?,...)
  // Insert while ignoring conflicts on a specific unique/PK constraint
  buildInsertOrIgnore(
    table: string,
    columns: string[],
    conflictColumns?: string[]
  ): string; // MySQL: INSERT IGNORE, PG/SQLite: ON CONFLICT(cols) DO NOTHING
  // Upsert on primary key id
  buildUpsertOnId(
    table: string,
    columns: string[],
    updateColumns: string[]
  ): string; // MySQL: ON DUPLICATE KEY UPDATE; PG/SQLite: ON CONFLICT(id) DO UPDATE SET
  // Select / Update / Delete builders
  buildSelect(
    table: string,
    columns: string[],
    where?: string,
    orderBy?: string,
    limit?: number,
    groupBy?: string
  ): string;
  buildUpdate(
    table: string,
    setColumns: string[],
    where: string
  ): string;
  buildUpdateParts(
    table: string,
    setParts: string[],
    where: string
  ): string;
  buildDelete(
    table: string,
    where: string
  ): string;
  // Returning id support (Postgres)
  hasReturningId(): boolean;
  returningIdFragment(): string; // e.g. " RETURNING id" or ""
}

class Dialect implements IDialect {
  name: SupportedDrivers;
  constructor(name: SupportedDrivers) { this.name = name; }
  boolParam(value: boolean): any {
    switch (this.name) {
      case "postgres": return !!value;
      case "sqlite":
      case "mysql":
      default: return value ? 1 : 0;
    }
  }
  visibilityPredicate(column: string): string {
    switch (this.name) {
      case "postgres": return `${column} = TRUE`;
      case "sqlite":
      case "mysql":
      default: return `${column} = 1`;
    }
  }
  buildLike(column: string, caseInsensitive = false, withEscape = true): string {
    if (this.name === "postgres") {
      const op = caseInsensitive ? "ILIKE" : "LIKE";
      return `${column} ${op} ?${withEscape ? " ESCAPE '\\'" : ""}`;
    }
    const col = caseInsensitive ? `LOWER(${column})` : column;
    return `${col} LIKE ?${withEscape ? " ESCAPE '\\'" : ""}`;
  }
  prepareLikeParam(value: string, mode: "contains" | "startsWith" | "endsWith" | "exact" = "contains", caseInsensitive = false): string {
    let v = this.escapeLike(value);
    if (caseInsensitive && this.name !== "postgres") v = v.toLowerCase();
    switch (mode) {
      case "startsWith": return `${v}%`;
      case "endsWith": return `%${v}`;
      case "exact": return v;
      case "contains":
      default: return `%${v}%`;
    }
  }
  escapeLike(raw: string): string { return raw.replace(/([%_\\])/g, "\\$1"); }
  buildInsert(table: string, columns: string[]): string {
    const cols = columns.join(", ");
    const qs = columns.map(() => "?").join(", ");
    return `INSERT INTO ${table} (${cols}) VALUES (${qs})`;
  }
  buildInsertOrIgnore(table: string, columns: string[], conflictColumns?: string[]): string {
    const cols = columns.join(", ");
    const qs = columns.map(() => "?").join(", ");
    switch (this.name) {
      case "mysql":
        return `INSERT IGNORE INTO ${table} (${cols}) VALUES (${qs})`;
      case "postgres": {
        const conflict = conflictColumns && conflictColumns.length > 0
          ? ` ON CONFLICT (${conflictColumns.join(", ")}) DO NOTHING`
          : "";
        return `INSERT INTO ${table} (${cols}) VALUES (${qs})${conflict}`;
      }
      case "sqlite":
      default:
        return `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${qs})`;
    }
  }
  buildUpsertOnId(table: string, columns: string[], updateColumns: string[]): string {
    const cols = columns.join(", ");
    const qs = columns.map(() => "?").join(", ");
    switch (this.name) {
      case "mysql": {
        const set = updateColumns.map((c) => `${c} = VALUES(${c})`).join(", ");
        return `INSERT INTO ${table} (${cols}) VALUES (${qs}) ON DUPLICATE KEY UPDATE ${set}`;
      }
      case "postgres":
      case "sqlite":
      default: {
        const set = updateColumns.map((c) => `${c} = excluded.${c}`).join(", ");
        return `INSERT INTO ${table} (${cols}) VALUES (${qs}) ON CONFLICT(id) DO UPDATE SET ${set}`;
      }
    }
  }
  buildSelect(table: string, columns: string[], where?: string, orderBy?: string, limit?: number, groupBy?: string): string {
    const cols = columns.length ? columns.join(", ") : "*";
    let sql = `SELECT ${cols} FROM ${table}`;
    if (where && where.trim()) sql += ` WHERE ${where}`;
    if (groupBy && groupBy.trim()) sql += ` GROUP BY ${groupBy}`;
    if (orderBy && orderBy.trim()) sql += ` ORDER BY ${orderBy}`;
    if (typeof limit === "number") sql += ` LIMIT ${limit}`;
    return sql;
  }
  buildUpdate(table: string, setColumns: string[], where: string): string {
    const set = setColumns.map((c) => `${c} = ?`).join(", ");
    return `UPDATE ${table} SET ${set} WHERE ${where}`;
  }
  buildUpdateParts(table: string, setParts: string[], where: string): string {
    const set = setParts.join(", ");
    return `UPDATE ${table} SET ${set} WHERE ${where}`;
  }
  buildDelete(table: string, where: string): string {
    return `DELETE FROM ${table} WHERE ${where}`;
  }
  hasReturningId(): boolean { return this.name === "postgres"; }
  returningIdFragment(): string { return this.name === "postgres" ? " RETURNING id" : ""; }
}

export function createDialect(): IDialect {
  const d = String(process.env.DATABASE_DRIVER || "sqlite").toLowerCase() as SupportedDrivers;
  return new Dialect(d);
}