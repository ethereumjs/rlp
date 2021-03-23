import * as assert from 'assert'
import { exec } from 'child_process'
import * as RLP from '../dist'
import * as vm from 'vm'

const txt = {
  // @ts-ignore
  TextDecoder: typeof TextDecoder === 'undefined' ? require('util').TextDecoder : TextDecoder,
}

function arrayToUtf8(ui8a: Uint8Array): string {
  // @ts-ignore
  return new txt.TextDecoder().decode(ui8a)
}

describe('Distribution:', function() {
  it('should be able to execute functionality from distribution build', function() {
    const encodedSelf = RLP.encode('a')
    assert.equal(arrayToUtf8(encodedSelf), 'a')
    assert.equal(RLP.getLength(encodedSelf), 1)
  })
})

describe('CLI command:', function() {
  it('should be able to run CLI command', function() {
    exec('./bin/rlp encode "[ 5 ]"', (_error, stdout, _stderr) => {
      assert.equal(stdout.trim(), 'c105')
    })
  })
})

describe('Cross-frame:', function() {
  it('should be able to encode Arrays across stack frames', function() {
    assert.equal(
      vm.runInNewContext(
        "Array.from(RLP.encode(['dog', 'god', 'cat'])).map(a => a.toString(16)).join('')",
        { RLP },
      ),
      'cc83646f6783676f6483636174',
    )
  })
})
