declare module "sql.js" {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryExecResult[];
    each(sql: string, callback: (row: any) => void, done: () => void): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  export interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    get(): any[];
    getAsObject(): Record<string, any>;
    run(params?: any[]): void;
    reset(): void;
    free(): boolean;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
