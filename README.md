# MinuteMind — meeting notes that write themselves

A Web/Chrome app for **#BuildHybridAI 2026** (Best Web/Chrome App).
Paste a meeting transcript or lecture notes and get structured minutes:
a summary, the decisions, a checkable action list, and a follow-up email draft.

All AI inference goes through **Firebase AI Logic hybrid inference**:
short notes run on-device on **Gemini Nano 4** (private, free, offline-capable);
long notes fall back to **Gemini 2.5 Flash in the cloud**. The app shows which
path actually ran for every request.

## Try it in under 15 minutes (no Firebase account needed)

```bash
git clone <repo-url> minutemind
cd minutemind
npm install
npm run dev
```

Open http://localhost:5173, press **Load short sample**, then **Generate minutes**.

Without a Firebase config the app runs in **transparent demo mode**: minutes are
made by a local extractive summarizer in your browser, and the screen says so
("Demo fallback · local, not AI"). Nothing is faked — the demo path exists so
the UI is fully usable before the real AI is wired in.

## Go live with real Firebase AI Logic (about 10 minutes)

Agus owns the Firebase project — it is created in his Google account, never
from this repo. Steps:

1. **Firebase console** → create/select a project → **AI Services → AI Logic**
   → **Get started**. Choose the **Gemini Developer API** (free tier) and let
   the workflow enforce **App Check** for AI Logic.
2. **Project settings → Your apps → Web app** → copy the config values.
3. `cp .env.example .env` and fill in the `VITE_FIREBASE_*` values.
4. **App Check (local dev):** keep `VITE_APPCHECK_DEBUG=true`, run the app,
   copy the debug token printed in the browser console, and register it in
   the Firebase console under **App Check → Apps → Manage debug tokens**.
   (Debug tokens are accepted for hackathon submissions. For production, set
   `VITE_RECAPTCHA_SITE_KEY` instead — see `.env.example`.)
5. **Chrome for on-device inference:** Chrome 139+ on desktop, enable
   `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart.
   The on-device model downloads on first use.
6. Restart `npm run dev`.

### Verify the live path

- The top bar should read **Firebase: configured** (green).
- Generate minutes from a sample. The badge above the results must read
  **Firebase AI Logic · ran on-device (Gemini Nano 4)** or
  **Firebase AI Logic · ran in cloud (Gemini 2.5 Flash)** — the value comes
  from `result.response.inferenceSource`, i.e. the path that actually ran,
  not the path that was requested.
- Short sample → on-device-first; long sample → cloud-first. Toggle the
  **Private only** / **Cloud only** modes to force each path.

## How the hybrid routing works

| Note | Privacy mode | Firebase `InferenceMode` | What happens |
| --- | --- | --- | --- |
| ≤ 3,500 chars | Hybrid (default) | `PREFER_ON_DEVICE` | Nano first, cloud fallback |
| > 3,500 chars | Hybrid (default) | `PREFER_IN_CLOUD` | Cloud first, Nano fallback if offline |
| any | Private only | `ONLY_ON_DEVICE` | On-device only; fails rather than sending data out |
| any | Cloud only | `ONLY_IN_CLOUD` | Cloud only; best for long/complex notes |

The model is created exactly as the Firebase docs specify for hybrid web apps
(SDK v12.5.0+):

```js
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema } from 'firebase/ai';

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: {
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  },
  onDeviceParams: { promptOptions: { responseConstraint: schema } },
});
await model.initializeDeviceModel((p) => /* download progress */);
const result = await model.generateContent(prompt);
result.response.text(); // result.response.inferenceSource: 'ON_DEVICE' | 'IN_CLOUD'
```

Both paths return the same JSON shape (summary, decisions, action items with
owner/due, follow-up email) because the same schema is given to the cloud
model (`generationConfig.responseSchema`) and to the on-device model
(`promptOptions.responseConstraint`). All AI inference in this project goes
through this one module (`src/ai.js`) — no other model API is called anywhere.

## Project structure

```
index.html            App shell
src/
  main.js             UI wiring (generate, library, export, copy)
  ai.js               Firebase AI Logic integration (the only AI caller)
  config.js           Firebase config from .env (placeholder until provided)
  routing.js          Pure hybrid-routing rules (unit-tested)
  fallback.js         Transparent local demo summarizer (labelled, not AI)
  samples.js          Two built-in sample transcripts
  styles.css          Styling
tests/                node:test suites for routing + fallback
scripts/ai-smoke.mjs  Smoke test for the Firebase path (vite-node)
dist/                 Production build (npm run build)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4173 |
| `npm test` | Unit tests (routing + fallback): 13 passing |
| `npm run test:ai` | Smoke test for the Firebase AI Logic path (see below) |

`npm run test:ai` proves, without a real project, that `src/ai.js` imports
cleanly (including the JSON schema), that placeholder config returns a clean
`no-config` without faking a call, and — with shaped-but-fake `VITE_FIREBASE_*`
values — that the hybrid model constructs for all four inference modes with
no SDK warnings. A live `generateContent()` call needs a real Firebase
project; that is the "Verify the live path" check above.

## Privacy

- Notes are stored only in the browser's local storage (the Library).
- In Hybrid/Private modes the transcript stays on-device whenever Nano runs it.
- In Cloud mode (or hybrid fallback) the transcript is sent to Google's
  Gemini API via Firebase AI Logic — the privacy selector says so before
  you press Generate, and the result badge says which path actually ran.
- The demo fallback sends nothing anywhere.

## Known limits

- On-device inference needs Chrome 139+ on desktop with the Prompt API flag;
  other browsers use the cloud path.
- On-device inference is single-turn text generation (no chat) — which is all
  this app needs.
- The cloud fallback model is `gemini-2.5-flash` (override in `src/routing.js`).

## License

MIT — see `LICENSE`.
