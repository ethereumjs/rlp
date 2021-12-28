import { ToBufferInputTypes } from 'ethereumjs-util' // eslint-disable-line

export type Input = ToBufferInputTypes | bigint | List

export type List = Input[]

export interface Decoded {
  data: Buffer | Buffer[]
  remainder: Buffer
}
