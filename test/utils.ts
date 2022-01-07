// Global symbols in both browsers and Node.js since v11
// See https://github.com/microsoft/TypeScript/issues/31535
declare const TextEncoder: any
declare const TextDecoder: any

export function utf8ToBytes(utf: string): Uint8Array {
  return new TextEncoder().encode(utf)
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}
