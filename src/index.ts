import { addHexPrefix, isHexPrefixed, toBuffer } from 'ethereumjs-util'
import { Decoded, Input, List } from './types'

// Types exported outside of this package
export { Decoded, Input, List }

/**
 * RLP Encoding based on https://eth.wiki/en/fundamentals/rlp
 * This function takes in a data, convert it to buffer if not, and a length for recursion
 * @param input - will be converted to buffer
 * @returns returns buffer of encoded data
 */
export function encode(input: Input): Buffer {
  if (Array.isArray(input)) {
    const output: Buffer[] = []
    for (let i = 0; i < input.length; i++) {
      output.push(encode(input[i]))
    }
    const buf = Buffer.concat(output)
    return Buffer.concat([encodeLength(buf.length, 192), buf])
  }

  // Edge case, see https://eth.wiki/en/fundamentals/rlp
  // "The integer 0 = [ 0x80 ]"
  // EthereumJS-util would convert 0 to the Buffer.from('00', 'hex'), which would
  // thus return Buffer.from('00', 'hex') when encoding that: this does not match the spec.
  if (input === 0) {
    return Buffer.from('80', 'hex')
  }

  if (typeof input === 'string' && !isHexPrefixed(input)) {
    input = Buffer.from(input)
  } else if (typeof input === 'bigint') {
    input = addHexPrefix(input.toString(16))
  }

  const inputBuf = toBuffer(input)

  if (inputBuf.length === 1 && inputBuf[0] < 128) {
    return inputBuf
  }
  return Buffer.concat([encodeLength(inputBuf.length, 128), inputBuf])
}

/**
 * Slices a Buffer, throws if the slice goes out-of-bounds of the Buffer
 * E.g. safeSlice(Buffer.from('aa', 'hex'), 1, 2) will throw.
 * @param input
 * @param start
 * @param end
 */
function safeSlice(input: Buffer, start: number, end: number) {
  if (end > input.length) {
    throw new Error('invalid RLP (safeSlice): end slice of Buffer out-of-bounds')
  }
  return input.slice(start, end)
}

/**
 * Parse integers. Check if there is no leading zeros
 * @param v The value to parse
 * @param base The base to parse the integer into
 */
function safeParseInt(v: string, base: number): number {
  if (v[0] === '0' && v[1] === '0') {
    throw new Error('invalid RLP: extra zeros')
  }

  return parseInt(v, base)
}

function encodeLength(len: number, offset: number): Buffer {
  if (len < 56) {
    return Buffer.from([len + offset])
  }
  const hexLength = len.toString(16)
  const lLength = hexLength.length / 2
  const firstByte = (offset + 55 + lLength).toString(16)
  return Buffer.from(firstByte + hexLength, 'hex')
}

/**
 * RLP Decoding based on https://eth.wiki/en/fundamentals/rlp
 * @param input - will be converted to buffer
 * @param stream - Is the input a stream (false by default)
 * @returns - returns decode Array of Buffers containing the original message
 **/
export function decode(input: Buffer, stream?: boolean): Buffer
export function decode(input: Buffer[], stream?: boolean): Buffer[]
export function decode(input: Input, stream?: boolean): Buffer[] | Buffer | Decoded
export function decode(input: Input, stream: boolean = false): Buffer[] | Buffer | Decoded {
  if (!input || (input as any).length === 0) {
    return Buffer.from([])
  }

  if (typeof input === 'bigint') {
    input = addHexPrefix(input.toString(16))
  }

  const inputBuffer = toBuffer(input as any) // TODO find out why input's `List` is an incompatible type here (when removing `as any`)
  const decoded = _decode(inputBuffer)

  if (stream) {
    return decoded
  }
  if (decoded.remainder.length !== 0) {
    throw new Error('invalid remainder')
  }

  return decoded.data
}

/**
 * Get the length of the RLP input
 * @param input
 * @returns The length of the input or an empty Buffer if no input
 */
export function getLength(input: Input): Buffer | number {
  if (!input || (input as any).length === 0) {
    return Buffer.from([])
  }

  if (typeof input === 'bigint') {
    input = addHexPrefix(input.toString(16))
  }

  const inputBuffer = toBuffer(input as any) // TODO find out why input's `List` is an incompatible type here (when removing `as any`)
  const firstByte = inputBuffer[0]

  if (firstByte <= 0x7f) {
    return inputBuffer.length
  } else if (firstByte <= 0xb7) {
    return firstByte - 0x7f
  } else if (firstByte <= 0xbf) {
    return firstByte - 0xb6
  } else if (firstByte <= 0xf7) {
    // a list between  0-55 bytes long
    return firstByte - 0xbf
  } else {
    // a list  over 55 bytes long
    const llength = firstByte - 0xf6
    const length = safeParseInt(safeSlice(inputBuffer, 1, llength).toString('hex'), 16)
    return llength + length
  }
}

/** Decode an input with RLP */
function _decode(input: Buffer): Decoded {
  let length, llength, data, innerRemainder, d
  const decoded = []
  const firstByte = input[0]

  if (firstByte <= 0x7f) {
    // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
    return {
      data: input.slice(0, 1),
      remainder: input.slice(1),
    }
  } else if (firstByte <= 0xb7) {
    // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
    // The range of the first byte is [0x80, 0xb7]
    length = firstByte - 0x7f

    // set 0x80 null to 0
    if (firstByte === 0x80) {
      data = Buffer.from([])
    } else {
      data = safeSlice(input, 1, length)
    }

    if (length === 2 && data[0] < 0x80) {
      throw new Error('invalid rlp encoding: invalid prefix, single byte < 0x80 are not prefixed')
    }

    return {
      data: data,
      remainder: input.slice(length),
    }
  } else if (firstByte <= 0xbf) {
    // string is greater than 55 bytes long. A single byte with the value (0xb7 plus the length of the length),
    // followed by the length, followed by the string
    llength = firstByte - 0xb6
    if (input.length - 1 < llength) {
      throw new Error('invalid RLP: not enough bytes for string length')
    }
    length = safeParseInt(safeSlice(input, 1, llength).toString('hex'), 16)
    if (length <= 55) {
      throw new Error('invalid RLP: expected string length to be greater than 55')
    }
    data = safeSlice(input, llength, length + llength)

    return {
      data: data,
      remainder: input.slice(length + llength),
    }
  } else if (firstByte <= 0xf7) {
    // a list between  0-55 bytes long
    length = firstByte - 0xbf
    innerRemainder = safeSlice(input, 1, length)
    while (innerRemainder.length) {
      d = _decode(innerRemainder)
      decoded.push(d.data as Buffer)
      innerRemainder = d.remainder
    }

    return {
      data: decoded,
      remainder: input.slice(length),
    }
  } else {
    // a list  over 55 bytes long
    llength = firstByte - 0xf6
    length = safeParseInt(safeSlice(input, 1, llength).toString('hex'), 16)
    if (length < 56) {
      throw new Error('invalid RLP: encoded list too short')
    }
    const totalLength = llength + length
    if (totalLength > input.length) {
      throw new Error('invalid rlp: total length is larger than the data')
    }

    innerRemainder = safeSlice(input, llength, totalLength)

    while (innerRemainder.length) {
      d = _decode(innerRemainder)
      decoded.push(d.data as Buffer)
      innerRemainder = d.remainder
    }

    return {
      data: decoded,
      remainder: input.slice(totalLength),
    }
  }
}
