import BN = require('bn.js')

export type Input = Buffer | string | number | bigint | Uint8Array | typeof BN | List | null

// Use interface extension instead of type alias to
// make circular declaration possible.
export interface List extends Array<Input> {}

export interface Decoded {
  data: Buffer | Buffer[]
  remainder: Buffer
}
