// Firebase AI Logic integration — the only place in the app that talks to an
// AI model. ALL of the app's AI inference goes through Firebase AI Logic:
// no other model API is called anywhere in this project.
//
// Hybrid inference (Firebase AI Logic SDK v12.5.0+, web):
//   const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
//   const model = getGenerativeModel(ai, {
//     mode: InferenceMode.PREFER_ON_DEVICE, // on-device Gemini Nano 4 first
//     inCloudParams: {
//       model: 'gemini-2.5-flash',          // cloud fallback model
//       generationConfig: {
//         responseMimeType: 'application/json',
//         responseSchema: minutesSchema,
//       },
//     },
//     onDeviceParams: {
//       promptOptions: { responseConstraint: minutesSchema },
//     },
//   });
//   await model.initializeDeviceModel(progress => ...); // on user gesture
//   const result = await model.generateContent(prompt);
//   result.response.text();
//   result.response.inferenceSource; // 'ON_DEVICE' or 'IN_CLOUD'
//
// On-device inference uses Chrome's Prompt API (Gemini Nano 4, Chrome 139+
// on desktop). When Nano is unavailable the SDK falls back to the cloud
// Gemini model automatically, and vice versa for PREFER_IN_CLOUD.
//
// If no real Firebase config is present (placeholder values in .env), this
// module does NOT fake a Firebase call: generateMinutes() returns
// { status: 'no-config' } and the UI falls back to the transparent local
// extractive summarizer in src/fallback.js, clearly labelled "Demo fallback".

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
} from 'firebase/ai';
import {
  appCheckDebug,
  firebaseConfig,
  isPlaceholderConfig,
  recaptchaSiteKey,
} from './config.js';
import { chooseRoute, CLOUD_MODEL } from './routing.js';

let firebaseApp = null;
let ai = null;

// Structured output: on-device and cloud models both support JSON output
// against a schema, so minutes always come back in the same shape.
const minutesSchema = Schema.object({
  properties: {
    summary: Schema.string(),
    decisions: Schema.array({ items: Schema.string() }),
    actionItems: Schema.array({
      items: Schema.object({
        properties: {
          task: Schema.string(),
          owner: Schema.string(),
          due: Schema.string(),
        },
      }),
    }),
    followUpEmail: Schema.string(),
  },
});

function initFirebase() {
  if (firebaseApp) return firebaseApp;
  if (isPlaceholderConfig()) {
    throw new Error(
      'Firebase config is still the placeholder — copy .env.example to .env ' +
        'and fill in the Firebase web app config.',
    );
  }
  firebaseApp = initializeApp(firebaseConfig);

  // Firebase AI Logic requires App Check. Debug tokens are accepted for
  // hackathon submissions: with VITE_APPCHECK_DEBUG=true the SDK prints a
  // debug token in the console — register it in the Firebase console under
  // App Check > Apps > Manage debug tokens. Production uses reCAPTCHA v3.
  try {
    if (recaptchaSiteKey) {
      if (appCheckDebug) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (appCheckDebug) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.warn(
        '[MinuteMind] App Check: debug mode on, but no reCAPTCHA site key ' +
          'configured — set VITE_RECAPTCHA_SITE_KEY to enable App Check.',
      );
    }
  } catch (err) {
    // App Check setup must never break the AI feature itself; the failure is
    // surfaced in the UI status panel instead.
    console.warn('[MinuteMind] App Check setup skipped:', err.message);
  }

  ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  return firebaseApp;
}

/**
 * Build the hybrid GenerativeModel for a given inference mode.
 * Split out from generateMinutesWithAI so model construction (SDK wiring,
 * params shape, schema) can be verified without a network call.
 */
export function createHybridModel(modeKey) {
  initFirebase();
  const mode = InferenceMode[modeKey];
  return getGenerativeModel(ai, {
    mode,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: minutesSchema,
      },
    },
    onDeviceParams: {
      promptOptions: { responseConstraint: minutesSchema },
    },
  });
}
export async function checkOnDeviceAvailability() {
  try {
    if (typeof window === 'undefined' || !window.LanguageModel?.availability) {
      return 'unknown';
    }
    return await window.LanguageModel.availability();
  } catch {
    return 'unknown';
  }
}

function buildPrompt(title, transcript) {
  return [
    `You are MinuteMind, a precise meeting-notes assistant.`,
    `Turn the transcript below into structured minutes as JSON matching the provided schema.`,
    `Rules: keep the summary to 2-4 sentences; list only decisions actually stated;`,
    `extract action items with the owner and due date when stated (use "Unassigned" / "No due date" otherwise);`,
    `write the follow-up email in a friendly professional tone, under 150 words.`,
    `Do not invent people, dates, or decisions that are not in the transcript.`,
    ``,
    `Meeting: ${title}`,
    `Transcript:`,
    transcript,
  ].join('\n');
}

function normalizeMinutes(parsed, title) {
  return {
    summary:
      typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : 'No summary was returned.',
    decisions: Array.isArray(parsed?.decisions)
      ? parsed.decisions.filter((d) => typeof d === 'string')
      : [],
    actionItems: Array.isArray(parsed?.actionItems)
      ? parsed.actionItems
          .filter((a) => a && typeof a.task === 'string')
          .map((a) => ({
            task: a.task,
            owner: typeof a.owner === 'string' && a.owner ? a.owner : 'Unassigned',
            due: typeof a.due === 'string' && a.due ? a.due : 'No due date',
            done: false,
          }))
      : [],
    followUpEmail:
      typeof parsed?.followUpEmail === 'string' && parsed.followUpEmail.trim()
        ? parsed.followUpEmail.trim()
        : `Hi all,\n\nHere are the notes from "${title}".\n\nThanks!`,
  };
}

/**
 * Generate structured minutes through Firebase AI Logic.
 * Must be called from a user gesture (button click): initializeDeviceModel()
 * requires user activation.
 *
 * @param {object} args
 * @param {string} args.transcript
 * @param {string} args.title
 * @param {'hybrid'|'private'|'cloud'} args.privacyMode
 * @param {(info: {phase: string, progress?: number}) => void} [args.onProgress]
 * @returns {Promise<{ status: 'ok'|'no-config', minutes?: object, route: object,
 *   onDevice: string, latencyMs?: number, engine?: string, error?: string }>}
 */
export async function generateMinutesWithAI({
  transcript,
  title,
  privacyMode,
  onProgress,
}) {
  const started = performance.now();
  const onDevice = await checkOnDeviceAvailability();
  const route = chooseRoute({
    chars: transcript.length,
    privacyMode,
    onDeviceAvailable: onDevice,
  });

  if (isPlaceholderConfig()) {
    return { status: 'no-config', route, onDevice };
  }

  initFirebase();
  const model = createHybridModel(route.modeKey);

  // Required before generateContent when on-device inference may be used.
  // Must run on/after a user gesture; non-fatal if it fails (cloud path
  // can still proceed for hybrid modes). The call may reject asynchronously
  // (e.g. no on-device model in this environment), so always attach a
  // handler — an unhandled rejection would otherwise crash the page.
  try {
    const maybePromise = model.initializeDeviceModel((progress) =>
      onProgress?.({ phase: 'downloading-model', progress }),
    );
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch((err) =>
        console.warn('[MinuteMind] initializeDeviceModel:', err.message),
      );
    }
  } catch (err) {
    console.warn('[MinuteMind] initializeDeviceModel:', err.message);
  }

  onProgress?.({ phase: 'generating' });
  const result = await model.generateContent(buildPrompt(title, transcript));
  const rawText = result.response.text();
  // Firebase AI Logic reports which path actually ran (SDK v12.5.0+).
  const inferenceSource = String(
    result.response.inferenceSource || '',
  ).toUpperCase();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model returned text that is not JSON.');
    parsed = JSON.parse(match[0]);
  }

  return {
    status: 'ok',
    minutes: normalizeMinutes(parsed, title),
    route,
    onDevice,
    inferenceSource: inferenceSource || 'UNKNOWN',
    latencyMs: Math.round(performance.now() - started),
    engine: 'firebase-ai-logic',
  };
}
