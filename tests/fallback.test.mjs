import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMinutes } from '../src/fallback.js';

const STANDUP = `Maya opened the standup by reminding everyone that the checkout redesign freezes on Friday, so any copy changes after that need Priya's approval. The team agreed to ship the new payment form first and hold the loyalty points banner for the next sprint, because the banner still needs legal review. Dan will deploy the payment form to staging by tomorrow so QA can test it. Priya will send the final onboarding email copy to Maya by Wednesday.`;

test('extracts a non-empty summary from a real note', () => {
  const m = extractMinutes(STANDUP, 'Standup');
  assert.ok(m.summary.length > 40, 'summary should carry real content');
  assert.match(m.summary, /checkout/i);
});

test('finds the stated decision', () => {
  const m = extractMinutes(STANDUP, 'Standup');
  assert.ok(m.decisions.length >= 1, 'expected at least one decision');
  assert.match(m.decisions.join(' '), /ship the new payment form/i);
});

test('extracts action items with owner and due date', () => {
  const m = extractMinutes(STANDUP, 'Standup');
  assert.ok(m.actionItems.length >= 2, 'expected action items');
  const dan = m.actionItems.find((a) => a.owner === 'Dan');
  assert.ok(dan, 'expected an item owned by Dan');
  assert.match(dan.task, /deploy the payment form/i);
  assert.equal(dan.done, false);
  const priya = m.actionItems.find((a) => a.owner === 'Priya');
  assert.ok(priya, 'expected an item owned by Priya');
  assert.match(priya.due, /Wednesday/i);
});

test('drafts a follow-up email mentioning the meeting and actions', () => {
  const m = extractMinutes(STANDUP, 'Standup');
  assert.match(m.followUpEmail, /Standup/);
  assert.match(m.followUpEmail, /Action items/);
});

test('short/empty text degrades gracefully instead of crashing', () => {
  const m = extractMinutes('hi', 'Tiny');
  assert.ok(m.summary.length > 0);
  assert.deepEqual(m.decisions, []);
  assert.deepEqual(m.actionItems, []);
});

test('output is deterministic', () => {
  const a = extractMinutes(STANDUP, 'Standup');
  const b = extractMinutes(STANDUP, 'Standup');
  assert.deepEqual(a, b);
});
