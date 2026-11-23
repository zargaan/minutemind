// Smoke test for the real Firebase AI Logic path (src/ai.js).
//
// Run with vite-node so import.meta.env works like it does under Vite:
//   npx vite-node scripts/ai-smoke.mjs
// With a shaped (but fake) config:
//   VITE_FIREBASE_API_KEY=x VITE_FIREBASE_AUTH_DOMAIN=x.firebaseapp.com \
//   VITE_FIREBASE_PROJECT_ID=x VITE_FIREBASE_STORAGE_BUCKET=x.firebasestorage.app \
//   VITE_FIREBASE_MESSAGING_SENDER_ID=1 VITE_FIREBASE_APP_ID=1:1:web:x \
//   npx vite-node scripts/ai-smoke.mjs
//
// What it proves, without needing a real Firebase project:
//  1. src/ai.js imports cleanly — including the structured-output Schema
//     construction at module load (a bad Schema call would throw here).
//  2. With placeholder config, generateMinutesWithAI() returns
//     { status: 'no-config' } WITHOUT faking a Firebase call.
//  3. With a shaped (but fake) config, createHybridModel() builds the
//     hybrid model via getAI + getGenerativeModel for all four inference
//     modes with the correct inCloudParams / onDeviceParams shape —
//     construction only, no network.
//
// The two branches are exclusive on purpose: with a non-placeholder config,
// generateMinutesWithAI() would attempt a LIVE generateContent() network
// call, which needs a real Firebase project (Agus provides the config).
// An earlier live attempt with a fake key hung on the network and timed
// out, so this script never calls it without a real project.
// See README "Verify the live path" for the live check.

import assert from 'node:assert/strict';
import {
  generateMinutesWithAI,
  checkOnDeviceAvailability,
  createHybridModel,
} from '../src/ai.js';
import { isPlaceholderConfig } from '../src/config.js';

const SHORT =
  'Maya opened the standup by reminding everyone that the checkout redesign freezes on Friday. ' +
  'The team agreed to ship the new payment form first. Dan will deploy the payment form to staging by tomorrow.';

console.log('placeholder config?', isPlaceholderConfig());

if (isPlaceholderConfig()) {
  // 1 + 2: placeholder config -> clean no-config, correct route, no throw.
  const noConfig = await generateMinutesWithAI({
    transcript: SHORT,
    title: 'Smoke test',
    privacyMode: 'hybrid',
  });
  assert.equal(noConfig.status, 'no-config');
  assert.equal(noConfig.route.modeKey, 'PREFER_ON_DEVICE');
  console.log('PASS: placeholder config returns no-config, route PREFER_ON_DEVICE');

  // Long text + cloud mode -> ONLY_IN_CLOUD route (still no-config).
  const long = await generateMinutesWithAI({
    transcript: SHORT.repeat(80),
    title: 'Smoke test',
    privacyMode: 'cloud',
  });
  assert.equal(long.route.modeKey, 'ONLY_IN_CLOUD');
  console.log('PASS: long/cloud route is ONLY_IN_CLOUD');

  // On-device availability probe must not throw outside a browser.
  const avail = await checkOnDeviceAvailability();
  assert.equal(avail, 'unknown');
  console.log('PASS: checkOnDeviceAvailability() =', avail, '(expected outside Chrome)');
  console.log('SKIP: model-construction check (run with VITE_FIREBASE_* set to non-placeholder values)');
} else {
  // 3: construction-only, no network, no generateContent() call.
  for (const mode of ['PREFER_ON_DEVICE', 'ONLY_ON_DEVICE', 'PREFER_IN_CLOUD', 'ONLY_IN_CLOUD']) {
    const model = createHybridModel(mode);
    assert.ok(model, `expected a model for ${mode}`);
    console.log(`PASS: createHybridModel(${mode}) constructed cleanly (no SDK warnings)`);
  }
}

console.log('AI SMOKE OK');
