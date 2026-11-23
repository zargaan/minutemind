// Deterministic local fallback for MinuteMind.
//
// This is NOT AI inference and NOT Firebase AI Logic. It is a transparent
// extractive summarizer that runs entirely in the browser so the app is fully
// usable and demonstrable before a real Firebase config is wired in
// (and offline, or when the Firebase call fails).
//
// Every result produced by this file is labelled "Demo fallback" in the UI.
// When a real Firebase config is present, src/ai.js is tried first and this
// file is only used if that call fails.
//
// Pure functions only — unit-tested in tests/fallback.test.mjs.

const DECISION_RE = /\b(decided|decision|agreed|agreement|concluded|approved|go with|we'll go with|final call)\b/i;
const ACTION_RE =
  /\b(will|need to|needs to|must|should|todo|to-do|action item|deadline|follow up|follow-up|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next week|end of)|due)\b/i;
const OWNER_RE = /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*(?:will|to|should|must|needs to)\b/;
const DUE_RE =
  /\bby\s+((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next week|end of (?:the )?(?:week|month|day)|[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?))\b/i;

function splitSentences(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/[\n]+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter((s) => s.length > 20);
}

function scoreSentence(s, index) {
  let score = 0;
  // Lead bias: the opening sentence usually states the topic.
  if (index === 0) score += 2;
  if (DECISION_RE.test(s)) score += 3;
  if (ACTION_RE.test(s)) score += 2;
  if (/\b(important|key|main|critical|priority|blocker|risk)\b/i.test(s)) score += 2;
  if (/\b(because|so we|therefore|means)\b/i.test(s)) score += 1;
  // Prefer mid-length sentences: long enough to carry meaning, short
  // enough to read as a summary line.
  if (s.length > 60 && s.length < 220) score += 1;
  return score;
}

/**
 * Build structured minutes from raw notes without any network call.
 * @param {string} transcript
 * @param {string} title
 * @returns {{ summary: string, decisions: string[], actionItems: {task:string,owner:string,due:string,done:boolean}[], followUpEmail: string }}
 */
export function extractMinutes(transcript, title = 'Untitled note') {
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) {
    return {
      summary: 'Not enough text to summarize — paste a longer note or transcript.',
      decisions: [],
      actionItems: [],
      followUpEmail:
        `Hi all,\n\nSharing notes from "${title}".\n\nNo decisions or action items were found in the text provided.\n\nThanks!`,
    };
  }

  const scored = sentences
    .map((text, index) => ({ text, index, score: scoreSentence(text, index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const top = scored.slice(0, 3).sort((a, b) => a.index - b.index);
  const summary = top.map((s) => s.text).join(' ');

  const decisions = sentences
    .filter((s) => DECISION_RE.test(s))
    .slice(0, 5);

  const actionItems = sentences
    .filter((s) => ACTION_RE.test(s))
    .slice(0, 6)
    .map((s) => {
      const ownerMatch = s.match(OWNER_RE);
      const dueMatch = s.match(DUE_RE);
      const task = s.replace(/\.$/, '');
      return {
        task: task.charAt(0).toUpperCase() + task.slice(1),
        owner: ownerMatch ? ownerMatch[1] : 'Unassigned',
        due: dueMatch ? dueMatch[1] : 'No due date',
        done: false,
      };
    });

  const actionsList =
    actionItems.length > 0
      ? actionItems.map((a) => `- ${a.task} (${a.owner}, ${a.due})`).join('\n')
      : '- None found in the notes.';
  const followUpEmail =
    `Hi all,\n\nHere are the notes from "${title}".\n\nSummary:\n${summary}\n\n` +
    `Decisions:\n${decisions.length > 0 ? decisions.map((d) => `- ${d}`).join('\n') : '- None recorded.'}\n\n` +
    `Action items:\n${actionsList}\n\nThanks!`;

  return { summary, decisions, actionItems, followUpEmail };
}
