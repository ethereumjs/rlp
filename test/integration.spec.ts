import * as assert from 'assert'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as RLP from '../dist'
import * as vm from 'vm'

describe('Distribution:', function() {
  it('should be able to execute functionality from distribution build', function() {
    const encodedSelf = RLP.encode('a')
    assert.equal(encodedSelf.toString(), 'a')
    assert.equal(RLP.getLength(encodedSelf), 1)
  })
})

const execAsync = promisify(exec)

describe('CLI command:', function() {
  it('should be able to run CLI command', async function() {
    const result = await execAsync('./bin/rlp encode "[ 5 ]"')
    const resultFormatted = result.stdout.trim()
    assert.equal(resultFormatted, '0xc105')
  })

  const officalTests = require('./fixture/rlptest.json').tests
  it('should return valid values for official tests', async function() {
    // tslint:disable-next-line
    this.timeout(10000)

    for (const testName in officalTests) {
      const { in: incoming, out } = officalTests[testName]

      // skip if testing a big number
      if (incoming[0] === '#') {
        continue
      }

      const json = JSON.stringify(incoming)
      const encodeResult = await execAsync(`./bin/rlp encode '${json}'`)
      const encodeResultTrimmed = encodeResult.stdout.trim()
      assert.equal(encodeResultTrimmed, out.toLowerCase(), `should pass encoding ${testName}`)
    }
  })
})

describe('Cross-frame:', function() {
  it('should be able to encode Arrays across stack frames', function() {
    assert.equal(
      vm.runInNewContext("RLP.encode(['dog', 'god', 'cat']).toString('hex')", { RLP }),
      'cc83646f6783676f6483636174',
    )
  })
})
