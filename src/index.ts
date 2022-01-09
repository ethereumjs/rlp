import {
  concatBytes,
  toBytes,
  parseHexByte,
  numberToHex,
  hexToBytes,
  bytesToHex,
  utf8ToBytes,
} from './utils'
import { Decoded, Input, List } from './types'

// Types exported for easy use
export { Decoded, Input, List }

/**
 * RLP Encoding based on https://eth.wiki/en/fundamentals/rlp
 * This function takes in a data, convert it to Uint8Array if not, and a length for recursion
 * @param input - will be converted to Uint8Array
 * @returns returns Uint8Array of encoded data
 **/
export function encode(input: Input): Uint8Array {
  if (Array.isArray(input)) {
    const output: Uint8Array[] = []
    for (let i = 0; i < input.length; i++) {
      output.push(encode(input[i]))
    }
    const buf = concatBytes(...output)
    return concatBytes(encodeLength(buf.length, 192), buf)
  }
  const inputBuf = toBytes(input)
  if (inputBuf.length === 1 && inputBuf[0] < 128) {
    return inputBuf
  }
  return concatBytes(encodeLength(inputBuf.length, 128), inputBuf)
}

/**
 * Slices a Uint8Array, throws if the slice goes out-of-bounds of the Uint8Array.
 * E.g. `safeSlice(RLP.utils.hexToBytes('aa'), 1, 2)` will throw.
 * @param input
 * @param start
 * @param end
 */
function safeSlice(input: Uint8Array, start: number, end: number) {
  if (end > input.length) {
    throw new Error('invalid RLP (safeSlice): end slice of Uint8Array out-of-bounds')
  }
  return input.slice(start, end)
}

/**
 * Parse integers. Check if there is no leading zeros
 * @param v The value to parse
 * @param base The base to parse the integer into
 */
function decodeLength(v: Uint8Array): number {
  if (v[0] === 0 && v[1] === 0) {
    throw new Error('invalid RLP: extra zeros')
  }

  return parseHexByte(bytesToHex(v))
}

function encodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) {
    return Uint8Array.from([len + offset])
  }
  const hexLength = numberToHex(len)
  const lLength = hexLength.length / 2
  const firstByte = numberToHex(offset + 55 + lLength)
  return Uint8Array.from(hexToBytes(firstByte + hexLength))
}

/**
 * RLP Decoding based on https://eth.wiki/en/fundamentals/rlp
 * @param input - will be converted to Uint8Array
 * @param stream - Is the input a stream (false by default)
 * @returns - returns decode Array of Uint8Arrays containing the original message
 **/
export function decode(input: Uint8Array, stream?: boolean): Uint8Array
export function decode(input: Uint8Array[], stream?: boolean): Uint8Array[]
export function decode(input: Input, stream?: boolean): Uint8Array[] | Uint8Array | Decoded
export function decode(input: Input, stream: boolean = false): Uint8Array[] | Uint8Array | Decoded {
  if (!input || (input as any).length === 0) {
    return Uint8Array.from([])
  }

  const inputBytes = toBytes(input)
  const decoded = _decode(inputBytes)

  if (stream) {
    return decoded
  }
  if (decoded.remainder.length !== 0) {
    throw new Error('invalid remainder')
  }

  return decoded.data
}

/** Decode an input with RLP */
function _decode(input: Uint8Array): Decoded {
  let length: number, llength: number, data: Uint8Array, innerRemainder: Uint8Array, d: Decoded
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
      data = Uint8Array.from([])
    } else {
      data = safeSlice(input, 1, length)
    }

    if (length === 2 && data[0] < 0x80) {
      throw new Error('invalid RLP encoding: invalid prefix, single byte < 0x80 are not prefixed')
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
    length = decodeLength(safeSlice(input, 1, llength))
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
      decoded.push(d.data as Uint8Array)
      innerRemainder = d.remainder
    }

    return {
      data: decoded,
      remainder: input.slice(length),
    }
  } else {
    // a list  over 55 bytes long
    llength = firstByte - 0xf6
    length = decodeLength(safeSlice(input, 1, llength))
    if (length < 56) {
      throw new Error('invalid RLP: encoded list too short')
    }
    const totalLength = llength + length
    if (totalLength > input.length) {
      throw new Error('invalid RLP: total length is larger than the data')
    }

    innerRemainder = safeSlice(input, llength, totalLength)

    while (innerRemainder.length) {
      d = _decode(innerRemainder)
      decoded.push(d.data as Uint8Array)
      innerRemainder = d.remainder
    }

    return {
      data: decoded,
      remainder: input.slice(totalLength),
    }
  }
}

export const utils = {
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
}

const RLP = { encode, decode }
export default RLP
