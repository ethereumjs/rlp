import assert from 'assert'
import BN from 'bn.js'
import * as RLP from '../src'
import official from './fixture/rlptest.json'
import invalid from './fixture/invalid.json'

describe('offical tests', function () {
  for (const [testName, test] of Object.entries(official.tests)) {
    it(`should pass ${testName}`, function (done) {
      let incoming: any = test.in
      // if we are testing a big number
      if (incoming[0] === '#') {
        const bn = new BN(incoming.slice(1))
        incoming = Buffer.from(bn.toArray())
      }

      const encoded = RLP.encode(incoming)
      const out = test.out[0] === '0' && test.out[1] === 'x' ? test.out.slice(2) : test.out
      assert.ok(encoded.equals(Buffer.from(out, 'hex')))
      done()
    })
  }
})

describe('invalid tests', function () {
  for (const [testName, test] of Object.entries(invalid.tests)) {
    it(`should pass ${testName}`, function (done) {
      let { out } = test
      if (out[0] === '0' && out[1] === 'x') {
        out = out.slice(2)
      }
      try {
        RLP.decode(Buffer.from(out, 'hex'))
        assert.fail(`should not decode invalid RLPs, input: ${out}`)
      } finally {
        done()
      }
    })
  }
})
