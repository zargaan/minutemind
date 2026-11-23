// MinuteMind UI wiring.
//
// Flow: user pastes notes -> picks a privacy mode -> clicks Generate.
// The click is the user gesture Firebase AI Logic needs for
// model.initializeDeviceModel(). The app first tries Firebase AI Logic
// (src/ai.js); with placeholder config, or if that call fails, it falls back
// to the transparent local extractive summarizer (src/fallback.js) and says
// so on screen — it never pretends the fallback is AI.

import { checkOnDeviceAvailability, generateMinutesWithAI } from './ai.js';
import { isPlaceholderConfig } from './config.js';
import { extractMinutes } from './fallback.js';
import { chooseRoute } from './routing.js';
import { SAMPLES } from './samples.js';

const LIBRARY_KEY = 'minutemind.library.v1';
const $ = (id) => document.getElementById(id);

const els = {
  title: $('title'),
  transcript: $('transcript'),
  charCount: $('char-count'),
  routePreview: $('route-preview'),
  chipConfig: $('chip-config'),
  chipDevice: $('chip-device'),
  chipRoute: $('chip-route'),
  btnGenerate: $('btn-generate'),
  progress: $('progress'),
  engineNote: $('engine-note'),
  emptyState: $('empty-state'),
  results: $('results'),
  resultTitle: $('result-title'),
  resultBadge: $('result-badge'),
  resultMeta: $('result-meta'),
  resultSummary: $('result-summary'),
  resultDecisions: $('result-decisions'),
  resultActions: $('result-actions'),
  resultEmail: $('result-email'),
  librarySearch: $('library-search'),
  libraryList: $('library-list'),
  libraryEmpty: $('library-empty'),
};

let onDeviceStatus = 'unknown';
let currentRecord = null;

function privacyMode() {
  const checked = document.querySelector('input[name="privacy"]:checked');
  return checked ? checked.value : 'hybrid';
}

function updateStatusChips() {
  if (isPlaceholderConfig()) {
    els.chipConfig.textContent = 'Firebase: demo config — add .env to go live';
    els.chipConfig.className = 'chip warn';
  } else {
    els.chipConfig.textContent = 'Firebase: configured';
    els.chipConfig.className = 'chip ok';
  }

  const deviceLabels = {
    available: ['On-device: Nano ready', 'ok'],
    downloading: ['On-device: Nano downloading…', 'warn'],
    downloadable: ['On-device: Nano downloadable', 'warn'],
    unavailable: ['On-device: not available here', 'warn'],
    unknown: ['On-device: unknown in this browser', ''],
  };
  const [label, cls] = deviceLabels[onDeviceStatus] || deviceLabels.unknown;
  els.chipDevice.textContent = label;
  els.chipDevice.className = `chip ${cls}`;
}

function updateRoutePreview() {
  const chars = els.transcript.value.length;
  els.charCount.textContent = `${chars.toLocaleString()} characters`;
  const route = chooseRoute({
    chars,
    privacyMode: privacyMode(),
    onDeviceAvailable: onDeviceStatus,
  });
  els.routePreview.textContent = `Route: ${route.routeLabel}`;
  els.chipRoute.textContent = `Route: ${route.modeLabel}`;
  els.chipRoute.className = `chip ${route.modeKey.includes('ON_DEVICE') && !route.modeKey.includes('ONLY_IN_CLOUD') ? 'ok' : 'cloud'}`;
  els.routePreview.title = route.reason;
  return route;
}

function setProgress(text) {
  els.progress.textContent = text;
}

function setEngineNote(text, kind) {
  els.engineNote.textContent = text;
  els.engineNote.className = `engine-note ${kind || ''}`;
}

function renderMinutes(record) {
  const { minutes, engine, routeLabel, latencyMs } = record;
  currentRecord = record;
  els.emptyState.hidden = true;
  els.results.hidden = false;
  els.resultTitle.textContent = record.title;

  const badge = els.resultBadge;
  if (engine === 'firebase-ai-logic') {
    badge.textContent =
      record.inferenceSource === 'ON_DEVICE'
        ? 'Firebase AI Logic · ran on-device (Gemini Nano 4)'
        : record.inferenceSource === 'IN_CLOUD'
          ? 'Firebase AI Logic · ran in cloud (Gemini 2.5 Flash)'
          : `Firebase AI Logic · ${routeLabel}`;
    badge.className = `badge ${record.inferenceSource === 'ON_DEVICE' ? 'device' : ''}`;
  } else {
    badge.textContent = 'Demo fallback · local, not AI';
    badge.className = 'badge demo';
  }

  els.resultMeta.textContent =
    `Generated ${new Date(record.createdAt).toLocaleString()}` +
    (latencyMs != null ? ` · took ${(latencyMs / 1000).toFixed(1)}s` : '') +
    (engine === 'firebase-ai-logic'
      ? ' · routed by the Firebase AI Logic SDK'
      : ' · no Firebase call was made');

  els.resultSummary.textContent = minutes.summary;

  els.resultDecisions.innerHTML = '';
  if (minutes.decisions.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'None recorded in these notes.';
    els.resultDecisions.appendChild(li);
  } else {
    minutes.decisions.forEach((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      els.resultDecisions.appendChild(li);
    });
  }

  els.resultActions.innerHTML = '';
  if (minutes.actionItems.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No action items found in these notes.';
    els.resultActions.appendChild(li);
  } else {
    minutes.actionItems.forEach((item) => {
      const li = document.createElement('li');
      if (item.done) li.classList.add('done');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!item.done;
      checkbox.setAttribute('aria-label', `Mark done: ${item.task}`);
      checkbox.addEventListener('change', () => {
        item.done = checkbox.checked;
        li.classList.toggle('done', item.done);
        persistCurrentRecord();
      });
      const task = document.createElement('span');
      task.className = 'task';
      task.textContent = item.task;
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = `${item.owner} · ${item.due}`;
      li.append(checkbox, task, who);
      els.resultActions.appendChild(li);
      void index;
    });
  }

  els.resultEmail.textContent = minutes.followUpEmail;
}

function minutesToMarkdown(record) {
  const m = record.minutes;
  const lines = [
    `# ${record.title}`,
    ``,
    `Generated ${new Date(record.createdAt).toLocaleString()} by MinuteMind (${record.engine}).`,
    ``,
    `## Summary`,
    ``,
    m.summary,
    ``,
    `## Decisions`,
    ``,
    ...(m.decisions.length ? m.decisions.map((d) => `- ${d}`) : ['- None recorded.']),
    ``,
    `## Action items`,
    ``,
    ...(m.actionItems.length
      ? m.actionItems.map((a) => `- [${a.done ? 'x' : ' '}] ${a.task} (${a.owner}, ${a.due})`)
      : ['- None found.']),
    ``,
    `## Follow-up email`,
    ``,
    m.followUpEmail,
    ``,
  ];
  return lines.join('\n');
}

// --- Library (localStorage, this device only) ---

function loadLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLibrary(items) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

function persistCurrentRecord() {
  if (!currentRecord?.id) return;
  const items = loadLibrary();
  const i = items.findIndex((r) => r.id === currentRecord.id);
  if (i >= 0) {
    items[i] = currentRecord;
    saveLibrary(items);
  }
}

function renderLibrary() {
  const query = els.librarySearch.value.trim().toLowerCase();
  const items = loadLibrary().filter(
    (r) =>
      !query ||
      r.title.toLowerCase().includes(query) ||
      r.minutes.summary.toLowerCase().includes(query),
  );
  els.libraryList.innerHTML = '';
  els.libraryEmpty.hidden = items.length > 0;
  items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((record) => {
      const li = document.createElement('li');
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'lib-title';
      title.textContent = record.title;
      const meta = document.createElement('div');
      meta.className = 'lib-meta';
      meta.textContent = `${new Date(record.createdAt).toLocaleString()} · ${record.minutes.actionItems.length} action items · ${record.engine === 'firebase-ai-logic' ? 'Firebase AI Logic' : 'Demo fallback'}`;
      info.append(title, meta);
      const actions = document.createElement('div');
      actions.className = 'lib-actions';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn btn-ghost btn-small';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        currentRecord = record;
        renderMinutes(record);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-ghost btn-small';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        saveLibrary(loadLibrary().filter((r) => r.id !== record.id));
        if (currentRecord?.id === record.id) currentRecord = null;
        renderLibrary();
      });
      actions.append(openBtn, delBtn);
      li.append(info, actions);
      els.libraryList.appendChild(li);
    });
}

// --- Generate ---

async function onGenerate() {
  const transcript = els.transcript.value.trim();
  const title = els.title.value.trim() || 'Untitled note';
  if (transcript.length < 50) {
    setProgress('Paste at least a few sentences first — or load a sample.');
    return;
  }

  els.btnGenerate.disabled = true;
  setEngineNote('', '');
  setProgress('Starting…');
  const route = updateRoutePreview();

  try {
    const result = await generateMinutesWithAI({
      transcript,
      title,
      privacyMode: privacyMode(),
      onProgress: (info) => {
        if (info.phase === 'downloading-model') {
          setProgress(
            `Downloading on-device model… ${Math.round((info.progress || 0) * 100)}%`,
          );
        } else {
          setProgress(`Asking ${route.routeLabel}…`);
        }
      },
    });

    if (result.status === 'no-config') {
      // No real Firebase config yet: honest local fallback, clearly labelled.
      const minutes = extractMinutes(transcript, title);
      setEngineNote(
        'Demo mode: no Firebase config found (.env), so these minutes were made locally in your browser — not by AI. Add your Firebase config to use real Firebase AI Logic.',
        'demo',
      );
      renderMinutes({
        id: null,
        title,
        createdAt: Date.now(),
        minutes,
        engine: 'demo-fallback',
        routeLabel: `${route.routeLabel} (unavailable — no config)`,
        latencyMs: null,
      });
      setProgress('Done — demo fallback (local). Add your Firebase config for real AI minutes.');
      return;
    }

    setEngineNote(
      `Live: generated by Firebase AI Logic (${result.inferenceSource === 'ON_DEVICE' ? 'on-device Gemini Nano 4' : result.inferenceSource === 'IN_CLOUD' ? 'cloud Gemini 2.5 Flash' : result.route.routeLabel}) in ${(result.latencyMs / 1000).toFixed(1)}s.`,
      'live',
    );
    renderMinutes({
      id: null,
      title,
      createdAt: Date.now(),
      minutes: result.minutes,
      engine: 'firebase-ai-logic',
      routeLabel: result.route.routeLabel,
      inferenceSource: result.inferenceSource,
      latencyMs: result.latencyMs,
    });
    setProgress('Done.');
  } catch (err) {
    // The Firebase call failed (network, quota, App Check, model error…):
    // say so, then still give the user usable minutes from the local fallback.
    console.error('[MinuteMind] Firebase AI Logic call failed:', err);
    const minutes = extractMinutes(transcript, title);
    setEngineNote(
      `Firebase AI Logic call failed (${err.message}). Showing local demo minutes instead — no AI call succeeded.`,
      'demo',
    );
    renderMinutes({
      id: null,
      title,
      createdAt: Date.now(),
      minutes,
      engine: 'demo-fallback',
      routeLabel: `${route.routeLabel} (failed)`,
      latencyMs: null,
    });
    setProgress('Done — demo fallback after an AI error. See the note above.');
  } finally {
    els.btnGenerate.disabled = false;
  }
}

// --- Events ---

function loadSample(id) {
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) return;
  els.title.value = sample.title;
  els.transcript.value = sample.text;
  updateRoutePreview();
  setProgress(`Loaded “${sample.label}”. Press Generate minutes when ready.`);
}

$('btn-sample-standup').addEventListener('click', () => loadSample('standup'));
$('btn-sample-client').addEventListener('click', () => loadSample('client-call'));
$('btn-generate').addEventListener('click', onGenerate);
els.transcript.addEventListener('input', updateRoutePreview);
document
  .querySelectorAll('input[name="privacy"]')
  .forEach((radio) => radio.addEventListener('change', updateRoutePreview));

$('file-input').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.transcript.value = String(reader.result || '');
    els.title.value = file.name.replace(/\.(txt|md)$/i, '').replace(/[-_]+/g, ' ');
    updateRoutePreview();
    setProgress(`Loaded “${file.name}”. Press Generate minutes when ready.`);
  };
  reader.readAsText(file);
});

$('btn-copy-email').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.resultEmail.textContent);
    setProgress('Follow-up email copied to clipboard.');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(els.resultEmail);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setProgress('Email selected — press Ctrl+C / Cmd+C to copy.');
  }
});

$('btn-export').addEventListener('click', () => {
  if (!currentRecord) return;
  const blob = new Blob([minutesToMarkdown(currentRecord)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentRecord.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
});

$('btn-save').addEventListener('click', () => {
  if (!currentRecord) return;
  const items = loadLibrary();
  if (!currentRecord.id) currentRecord.id = `mm-${Date.now()}`;
  const i = items.findIndex((r) => r.id === currentRecord.id);
  if (i >= 0) items[i] = currentRecord;
  else items.push(currentRecord);
  saveLibrary(items);
  renderLibrary();
  setProgress(`Saved “${currentRecord.title}” to the library (this device only).`);
});

els.librarySearch.addEventListener('input', renderLibrary);

// --- Init ---
updateStatusChips();
updateRoutePreview();
renderLibrary();
loadSample('standup');
checkOnDeviceAvailability().then((status) => {
  onDeviceStatus = status;
  updateStatusChips();
  updateRoutePreview();
});
