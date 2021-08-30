import * as assert from 'assert'
import * as RLP from '../src'
import BN from 'bn.js'

describe('offical tests', function () {
  const officalTests = require('./fixture/rlptest.json').tests

  // eslint-disable-next-line no-restricted-syntax
  for (const testName in officalTests) {
    it(`should pass ${testName}`, function (done) {
      let incoming = officalTests[testName].in
      // if we are testing a big number
      if (incoming[0] === '#') {
        const bn = new BN(incoming.slice(1))
        incoming = Buffer.from(bn.toArray())
      }

      const encoded = RLP.encode(incoming)
      assert.equal('0x' + encoded.toString('hex'), officalTests[testName].out.toLowerCase())
      done()
    })
  }
})

describe('invalid tests', function() {
  const invalidTests = require('./fixture/invalid.json').tests

  for (const testName in invalidTests) {
    it(`should pass ${testName}`, function(done) {
      let outcoming = invalidTests[testName].out
      if (outcoming.slice(0, 2) == '0x') {
        outcoming = outcoming.slice(2)
      }
      // if we are testing a big number
      try {
        RLP.decode(Buffer.from(outcoming, 'hex'))
      } catch (e) {
        done()
      }
    })
  }
})
