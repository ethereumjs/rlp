import * as assert from 'assert'
import * as RLP from '../src'

function arrayToHex(uint8a: Uint8Array): string {
  // pre-caching chars could speed this up 6x.
  let hex = ''
  for (let i = 0; i < uint8a.length; i++) {
    hex += uint8a[i].toString(16).padStart(2, '0')
  }
  return hex
}

function hexToArray(hex: string): Uint8Array {
  hex = hex.length & 1 ? `0${hex}` : hex
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < array.length; i++) {
    const j = i * 2
    array[i] = Number.parseInt(hex.slice(j, j + 2), 16)
  }
  return array
}

function numberToArray(num: number | bigint) {
  const hex = num.toString(16)
  return hexToArray(hex)
}

describe('offical tests', function() {
  const officalTests = require('./fixture/rlptest.json').tests

  for (const testName in officalTests) {
    it(`should pass ${testName}`, function(done) {
      let incoming = officalTests[testName].in
      // if we are testing a big number
      if (incoming[0] === '#') {
        const bn = BigInt(incoming.slice(1))
        incoming = numberToArray(bn)
      }

      const encoded = arrayToHex(RLP.encode(incoming))
      assert.equal('0x' + encoded, officalTests[testName].out.toLowerCase())
      done()
    })
  }
})
