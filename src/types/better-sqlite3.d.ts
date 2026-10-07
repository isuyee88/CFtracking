declare module 'better-sqlite3' {
  interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
  }

  class Database {
    constructor(filename: string, options?: DatabaseOptions);
    exec(sql: string): this;
    prepare(sql: string): Statement;
    close(): void;
  }

  namespace Database {
    type Database = InstanceType<typeof Database>;
  }

  interface Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get<T = Record<string, unknown>>(...params: unknown[]): T | undefined;
    all<T = Record<string, unknown>>(...params: unknown[]): T[];
  }

  export = Database;
}
