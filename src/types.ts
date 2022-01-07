export type Input = Buffer | string | number | bigint | Uint8Array | List | null

// Use interface extension instead of type alias to
// make circular declaration possible.
export interface List extends Array<Input> {}

export interface Decoded {
  data: Buffer | Buffer[]
  remainder: Buffer
}
