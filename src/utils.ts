import type { Input } from './types'

const cachedHexes = Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, '0'))
export function bytesToHex(uint8a: Uint8Array): string {
  // Pre-caching chars with `cachedHexes` speeds this up 6x
  let hex = ''
  for (let i = 0; i < uint8a.length; i++) {
    hex += cachedHexes[uint8a[i]]
  }
  return hex
}

export function parseHexByte(hexByte: string): number {
  if (hexByte.length !== 2) throw new Error('Invalid byte sequence')
  const byte = Number.parseInt(hexByte, 16)
  if (Number.isNaN(byte)) throw new Error('Invalid byte sequence')
  return byte
}

// Caching slows it down 2-3x
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToBytes: expected string, got ' + typeof hex)
  }
  if (hex.length % 2) throw new Error('hexToBytes: received invalid unpadded hex')
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < array.length; i++) {
    const j = i * 2
    array[i] = parseHexByte(hex.slice(j, j + 2))
  }
  return array
}

/** Concatenates two Uint8Arrays into one. */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  if (arrays.length === 1) return arrays[0]
  const length = arrays.reduce((a, arr) => a + arr.length, 0)
  const result = new Uint8Array(length)
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const arr = arrays[i]
    result.set(arr, pad)
    pad += arr.length
  }
  return result
}

// Global symbols in both browsers and Node.js since v11
// See https://github.com/microsoft/TypeScript/issues/31535
declare const TextEncoder: any
declare const TextDecoder: any // eslint-disable-line

export function utf8ToBytes(utf: string): Uint8Array {
  return new TextEncoder().encode(utf)
}

/** Transform an integer into its hexadecimal value */
export function numberToHex(integer: number | bigint): string {
  if (integer < 0) {
    throw new Error('Invalid integer as argument, must be unsigned!')
  }
  const hex = integer.toString(16)
  return hex.length % 2 ? `0${hex}` : hex
}

/** Pad a string to be even */
export function padToEven(a: string): string {
  return a.length % 2 ? `0${a}` : a
}

/** Transform anything into a Uint8Array */
export function toBytes(v: Input): Uint8Array {
  if (v instanceof Uint8Array) {
    return v
  }
  if (typeof v === 'string') {
    if (isHexPrefixed(v)) {
      return hexToBytes(padToEven(stripHexPrefix(v)))
    }
    return utf8ToBytes(v)
  }
  if (typeof v === 'number' || typeof v === 'bigint') {
    if (!v) {
      return Uint8Array.from([])
    }
    return hexToBytes(numberToHex(v))
  }
  if (v === null || v === undefined) {
    return Uint8Array.from([])
  }
  throw new Error('toBytes: received unsupported type')
}

/** Check if a string is prefixed by 0x */
export function isHexPrefixed(str: string): boolean {
  return str.length >= 2 && str[0] === '0' && str[1] === 'x'
}

/** Removes 0x from a given String */
export function stripHexPrefix(str: string): string {
  if (typeof str !== 'string') {
    return str
  }
  return isHexPrefixed(str) ? str.slice(2) : str
}
