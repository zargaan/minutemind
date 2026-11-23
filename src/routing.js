// Pure routing logic for MinuteMind's hybrid inference.
//
// Decides which Firebase AI Logic InferenceMode to request for a given note.
// Pure functions only — no Firebase imports — so this file is unit-testable
// in plain Node (see tests/routing.test.mjs).
//
// Modes (values match the Firebase AI Logic JS SDK `InferenceMode` enum):
//   prefer_on_device — on-device Gemini Nano 4 when available, cloud fallback
//   only_on_device   — on-device only, throws when Nano is unavailable
//   prefer_in_cloud  — cloud Gemini first, on-device fallback when offline
//   only_in_cloud    — cloud only
//
// Why the split: Gemini Nano is fast, free and private, but it is a small
// on-device model — it shines on short notes and struggles with long
// transcripts. Long transcripts go to the cloud model, where the extra
// context and reasoning are worth the round-trip.

export const CLOUD_MODEL = 'gemini-2.5-flash';

// Above this many characters a transcript is treated as "long" and routed
// to the cloud first. ~3,500 chars is roughly a page of meeting notes.
export const ON_DEVICE_CHAR_LIMIT = 3500;

/**
 * @param {object} args
 * @param {number} args.chars — transcript length in characters
 * @param {'hybrid'|'private'|'cloud'} args.privacyMode — user's privacy choice
 * @param {string} [args.onDeviceAvailable] — 'available' | 'downloading' |
 *   'downloadable' | 'unavailable' | 'unknown' (from LanguageModel.availability())
 * @returns {{ modeKey: string, modeLabel: string, routeLabel: string, reason: string }}
 */
export function chooseRoute({ chars, privacyMode, onDeviceAvailable = 'unknown' }) {
  if (privacyMode === 'private') {
    return {
      modeKey: 'ONLY_ON_DEVICE',
      modeLabel: 'On-device only',
      routeLabel: 'On-device · Gemini Nano 4',
      reason:
        'Private mode: the note never leaves this device. Fails instead of ' +
        'sending anything to the cloud.',
    };
  }

  if (privacyMode === 'cloud') {
    return {
      modeKey: 'ONLY_IN_CLOUD',
      modeLabel: 'Cloud only',
      routeLabel: 'Cloud · Gemini 2.5 Flash',
      reason:
        'Cloud mode: the full Gemini model, best for long or complex notes. ' +
        'Nothing runs on-device.',
    };
  }

  // Hybrid (default): short notes prefer on-device, long notes prefer cloud.
  if (chars > ON_DEVICE_CHAR_LIMIT) {
    return {
      modeKey: 'PREFER_IN_CLOUD',
      modeLabel: 'Hybrid · cloud-first',
      routeLabel: 'Cloud-first · Gemini 2.5 Flash',
      reason:
        `Long transcript (${chars.toLocaleString()} chars > ` +
        `${ON_DEVICE_CHAR_LIMIT.toLocaleString()}): the cloud model handles ` +
        'long context better. Falls back to on-device Nano if offline.',
    };
  }

  const nanoNote =
    onDeviceAvailable === 'unavailable'
      ? ' Nano is not available in this browser, so the SDK will fall back to the cloud.'
      : onDeviceAvailable === 'available'
        ? ' Nano is ready in this browser.'
        : '';
  return {
    modeKey: 'PREFER_ON_DEVICE',
    modeLabel: 'Hybrid · on-device-first',
    routeLabel: 'On-device-first · Gemini Nano 4',
    reason:
      `Short note (${chars.toLocaleString()} chars): try private, free, ` +
      `offline-capable Nano first, cloud fallback if needed.${nanoNote}`,
  };
}
