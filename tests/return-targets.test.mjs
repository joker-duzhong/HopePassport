import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReturnTarget } from '../src/config/returnTargets.ts'

test('ordinary scan flows have no back target', () => {
  assert.equal(parseReturnTarget(undefined), null)
})
for (const origin of [
  'https://lxyy.fun', 'https://nesttalk.lxyy.fun', 'https://new.deep.lxyy.fun:8443',
  'http://localhost:9000', 'http://app.localhost:8080', 'http://127.0.0.2:5174',
  'http://10.2.3.4:8888', 'http://172.16.0.1', 'http://172.31.255.254', 'http://192.168.9.8',
  'http://169.254.1.2', 'http://[::1]:8001', 'http://[fd12::1]:8001', 'http://[fe80::1]:8080',
]) {
  test(`allows domain/local host and preserves the entire back URL: ${origin}`, () => {
    const back = origin + '/arbitrary/callback?next=%2Fworkspace%3Ftab%3D1#state=abc&transaction_id=123'
    assert.equal(parseReturnTarget(back).url, new URL(back).href)
  })
}
for (const back of [
  'https://evil.test/callback', 'https://evillxyy.fun/', 'https://lxyy.fun.evil.test/',
  'https://lxyy.fun@evil.test/', 'https://user@lxyy.fun/', 'https://user:pass@localhost/',
  'http://nesttalk.lxyy.fun/', 'ftp://localhost/', 'javascript:alert(1)', 'data:text/html,test',
  '//lxyy.fun/path', '/relative', '', ' https://lxyy.fun/', 'https://lxyy.fun/\npath',
  'https://lxyy.fun\\@evil.test/', 'http://172.15.0.1/', 'http://172.32.0.1/',
  'http://192.169.1.1/', 'http://8.8.8.8/', 'https://localhost.evil.test/', 'http://[2001:db8::1]/',
]) {
  test(`rejects untrusted host or unsafe URL: ${JSON.stringify(back)}`, () => {
    assert.throws(() => parseReturnTarget(back))
  })
}
test('rejects empty, repeated and malformed back parameters', () => {
  for (const value of [null, [], ['https://lxyy.fun/', 'https://lxyy.fun/'], 123, {}]) {
    assert.throws(() => parseReturnTarget(value))
  }
})
