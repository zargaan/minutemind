# Devpost submission text — MinuteMind (#BuildHybridAI 2026)

## Project name

MinuteMind

## Tagline

Meeting notes that write themselves — privately on-device when possible,
in the cloud when needed.

## Description

Every meeting ends the same way: someone has to write the minutes, chase the
action items, and send the follow-up email — and usually nobody does. MinuteMind
fixes that in one click. Paste a meeting transcript or lecture notes and get
structured minutes: a summary, the decisions that were actually made, a
checkable action list with owners and due dates, and a follow-up email draft
ready to send.

The twist is where the AI runs. MinuteMind is built on **Firebase AI Logic
hybrid inference**: short notes run on-device on **Gemini Nano 4** — private,
free, and working offline — while long transcripts hand over to **Gemini 2.5
Flash in the cloud**. The user chooses the trade-off up front (Hybrid,
Private-only, or Cloud-only), and after every request the app shows which path
actually ran, read from `response.inferenceSource`. Nothing about the routing
is hidden or guessed.

MinuteMind is a complete product, not a demo shell: saved minutes live in a
searchable on-device library, action items can be ticked off, results export
to Markdown, and two built-in sample transcripts (a short standup and a long
client call) let anyone try it in under a minute with zero setup.

## How Firebase AI Logic is used

All AI inference in MinuteMind goes through Firebase AI Logic — no other model
API is called anywhere in the project. The integration lives in one module,
`src/ai.js`:

- `getAI(app, { backend: new GoogleAIBackend() })` with the Gemini Developer API.
- One hybrid model via `getGenerativeModel(ai, { mode, inCloudParams,
  onDeviceParams })`, where the mode is `PREFER_ON_DEVICE` for short notes,
  `PREFER_IN_CLOUD` for long notes, `ONLY_ON_DEVICE` for Private mode, and
  `ONLY_IN_CLOUD` for Cloud mode.
- `model.initializeDeviceModel()` is called on the Generate click (user
  gesture, as required), with download progress shown in the UI.
- `model.generateContent()` is called with a JSON schema so both paths return
  the same structured minutes. The same schema is passed to the cloud model
  as `generationConfig.responseSchema` and to the on-device model as
  `promptOptions.responseConstraint`.
- `result.response.inferenceSource` (`ON_DEVICE` / `IN_CLOUD`) drives the
  badge shown on every result.
- Firebase App Check protects the API (debug tokens for local development,
  reCAPTCHA v3 in production).

Routing rule: notes up to ~3,500 characters prefer on-device Nano; longer
transcripts prefer the cloud, where the extra context is worth the round-trip.
Private mode never lets a transcript leave the device.

## Inspiration

Meeting notes are the most universal "I'll do it later" chore in knowledge
work — and the most privacy-sensitive, since transcripts contain salaries,
layoffs, and unfiltered opinions. Hybrid inference is the honest answer: keep
the sensitive, short stuff on-device, and spend cloud compute only where it
earns its keep.

## What we learned

- Hybrid mode needs its config split: `model` and `generationConfig` belong
  in `inCloudParams`, and the on-device schema belongs in
  `onDeviceParams.promptOptions.responseConstraint` — top-level values are
  silently ignored, and the SDK tells you so in a console warning.
- On-device inference is genuinely single-turn and JSON-capable, which maps
  perfectly onto "turn this transcript into minutes".

## What's next

- Optional audio: record in-browser, transcribe on-device, then minute it.
- Share a meeting's minutes as a link with an expiry.
- Per-team routing defaults (e.g. HR notes always Private-only).

## Built with

Firebase AI Logic (Gemini Nano 4 on-device + Gemini 2.5 Flash cloud),
Firebase App Check, Vite, vanilla JavaScript.

## Submission checklist

- [ ] Public repo (GitHub) with MIT license, README setup < 15 min
- [ ] Demo video ≤ 3 min on YouTube (screen recording of the app working)
- [ ] This description + "How Firebase AI Logic is used" on Devpost
- [ ] Submit on Devpost before Mon Nov 30, 2026 22:00 UTC
