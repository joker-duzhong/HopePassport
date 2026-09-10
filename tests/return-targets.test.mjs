import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReturnTarget, returnUrl } from '../src/config/returnTargets.ts'

const state = 'a'.repeat(48)
const appKey = 'hope_teacher_logbook'
const path = '/auth/passport/callback'
test('ordinary scan flows have no return target', () => {
  assert.equal(parseReturnTarget(undefined, undefined, undefined, ''), null)
})
for (const [origin, environment] of [
  ['https://nesttalk.lxyy.fun', 'production'], ['http://localhost:5174', 'local'],
  ['http://127.0.0.1:5174', 'local'], ['http://192.168.31.93:5174', 'local'],
]) {
  test(`registered return origin ${origin}`, () => {
    const target = parseReturnTarget(origin + path, state, environment, appKey)
    const url = new URL(returnUrl(target, '00000000-0000-4000-8000-000000000001'))
    assert.equal(url.search, '')
    assert.equal(url.pathname, path)
    assert.equal(new URLSearchParams(url.hash.slice(1)).get('state'), state)
  })
}
for (const url of [
  'https://evil.test' + path, 'http://nesttalk.lxyy.fun' + path, 'https://nesttalk.lxyy.fun.evil.test' + path,
  'https://nesttalk.lxyy.fun@evil.test' + path, 'https://user@nesttalk.lxyy.fun' + path,
  'https://nesttalk.lxyy.fun/other', 'https://nesttalk.lxyy.fun' + path + '?next=https://evil.test',
  'https://nesttalk.lxyy.fun' + path + '#fragment', 'https://nesttalk.lxyy.fun/auth/other/../passport/callback',
  '//nesttalk.lxyy.fun' + path, 'javascript:alert(1)',
]) {
  test(`rejects unregistered or noncanonical target ${url}`, () => {
    assert.throws(() => parseReturnTarget(url, state, 'production', appKey))
  })
}
test('rejects cross-environment, cross-app, partial and repeated parameters', () => {
  assert.throws(() => parseReturnTarget('http://localhost:5174' + path, state, 'production', appKey))
  assert.throws(() => parseReturnTarget('https://nesttalk.lxyy.fun' + path, state, 'local', appKey))
  assert.throws(() => parseReturnTarget('https://nesttalk.lxyy.fun' + path, state, 'production', 'other_app'))
  assert.throws(() => parseReturnTarget('https://nesttalk.lxyy.fun' + path, '', 'production', appKey))
  assert.throws(() => parseReturnTarget(['https://nesttalk.lxyy.fun' + path], state, 'production', appKey))
})
