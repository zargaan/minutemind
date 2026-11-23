import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRoute, CLOUD_MODEL, ON_DEVICE_CHAR_LIMIT } from '../src/routing.js';

test('short hybrid note prefers on-device', () => {
  const r = chooseRoute({ chars: 800, privacyMode: 'hybrid', onDeviceAvailable: 'available' });
  assert.equal(r.modeKey, 'PREFER_ON_DEVICE');
  assert.match(r.reason, /Short note/);
});

test('long hybrid note prefers cloud', () => {
  const r = chooseRoute({
    chars: ON_DEVICE_CHAR_LIMIT + 100,
    privacyMode: 'hybrid',
    onDeviceAvailable: 'available',
  });
  assert.equal(r.modeKey, 'PREFER_IN_CLOUD');
  assert.match(r.reason, /Long transcript/);
});

test('boundary: exactly at the limit stays on-device-first', () => {
  const r = chooseRoute({ chars: ON_DEVICE_CHAR_LIMIT, privacyMode: 'hybrid' });
  assert.equal(r.modeKey, 'PREFER_ON_DEVICE');
});

test('private mode is only-on-device regardless of length', () => {
  const r = chooseRoute({ chars: 20000, privacyMode: 'private' });
  assert.equal(r.modeKey, 'ONLY_ON_DEVICE');
});

test('cloud mode is only-in-cloud regardless of length', () => {
  const r = chooseRoute({ chars: 100, privacyMode: 'cloud' });
  assert.equal(r.modeKey, 'ONLY_IN_CLOUD');
});

test('short note notes when Nano is unavailable in this browser', () => {
  const r = chooseRoute({ chars: 500, privacyMode: 'hybrid', onDeviceAvailable: 'unavailable' });
  assert.equal(r.modeKey, 'PREFER_ON_DEVICE');
  assert.match(r.reason, /fall back to the cloud/);
});

test('cloud model is a real Gemini model name', () => {
  assert.equal(CLOUD_MODEL, 'gemini-2.5-flash');
});
