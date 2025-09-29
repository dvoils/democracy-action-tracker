declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string
    max?: number
  }

  export interface QueryResult<T = any> {
    rows: T[]
    rowCount?: number
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>
    release(): void
  }

  export class Pool {
    constructor(config?: PoolConfig)
    connect(): Promise<PoolClient>
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>
    end(): Promise<void>
  }
}
