import { createHash } from 'node:crypto';

import type { WhispererContext, WhispererSavedQuestion } from './types';

export type EvidenceEntry = string | { question?: string; choices?: string[]; text: string };

export function questionOptions(
  turn: {
    id: string;
    role: string;
    included?: boolean;
    interrupted?: boolean;
    final?: boolean;
    originalText?: string | null;
    text: string;
  },
  saved?: WhispererSavedQuestion | null,
) {
  if (
    !saved ||
    turn.role !== 'assistant' ||
    turn.included === false ||
    turn.interrupted ||
    turn.final === false ||
    (turn.originalText != null && turn.originalText !== turn.text)
  )
    return undefined;
  const options = saved.id === turn.id ? saved : saved.previous?.[turn.id];
  if (options) return { choices: options.choices, choicesMode: options.choicesMode };
}

export function saveQuestionOptions(
  current: WhispererSavedQuestion,
  prior?: WhispererSavedQuestion | null,
): WhispererSavedQuestion {
  if (!prior) return current;
  const previous = { ...prior.previous };
  if (prior.choices.length)
    previous[prior.id] = { choices: prior.choices, choicesMode: prior.choicesMode };
  return { ...current, previous };
}

type InterviewLine = {
  role: string;
  text: string;
  included?: boolean;
  final?: boolean;
  interrupted?: boolean;
  choices?: string[];
};

export function modelOpening(opening: WhispererContext['opening'], first?: InterviewLine) {
  // An opening can only be pending or paired with the very first reply.
  return !first ||
    (first.role === 'user' &&
      first.included !== false &&
      first.final !== false &&
      first.text.trim())
    ? opening
    : undefined;
}

// Drop a question whose immediately following turn was discarded. Filtering
// the discarded turn first would attach its suggestions to another answer.
export function modelHistory<T extends InterviewLine>(source: readonly T[]) {
  const usable = (turn: T) =>
    turn.included !== false &&
    turn.final !== false &&
    !!turn.text.trim() &&
    !(turn.role === 'assistant' && turn.interrupted);
  return source.filter((turn, index) => {
    if (!usable(turn)) return false;
    const next = source[index + 1];
    return turn.role !== 'assistant' || !next || (next.role === 'user' && usable(next));
  });
}

// Only a completed author reply can contribute an entry. A discarded or
// unfinished turn breaks the pair, so its question cannot attach to a later reply.
export function answeredQuestions(
  lines: readonly InterviewLine[],
  opening?: WhispererContext['opening'] | string,
): EvidenceEntry[] {
  let question = typeof opening === 'string' ? opening : opening?.question;
  let choices = typeof opening === 'string' ? undefined : opening?.choices;
  const entries: EvidenceEntry[] = [];
  for (const line of lines) {
    const usable = line.final !== false && line.included !== false && !!line.text.trim();
    if (line.role === 'assistant') {
      question = usable && !line.interrupted ? line.text.trim().slice(-1200) : undefined;
      choices = question ? line.choices : undefined;
    } else if (line.role === 'user') {
      if (usable)
        entries.push({ question, ...(choices?.length ? { choices } : {}), text: line.text.trim() });
      question = undefined;
      choices = undefined;
    }
  }
  return entries;
}

function renderEvidence(entry: EvidenceEntry) {
  if (typeof entry === 'string') return entry.trim();
  if (!entry.question) return entry.text.trim();
  // Structured values keep author text distinct even if it contains quotes or newlines.
  return JSON.stringify({
    interviewerQuestion: entry.question,
    interviewerChoices: entry.choices,
    authorReply: entry.text,
  });
}

export function joinEvidence(entries: readonly EvidenceEntry[]) {
  return entries.map(renderEvidence).filter(Boolean).join('\n\n');
}

export function chunkEvidence(entries: readonly EvidenceEntry[]) {
  const chunks: EvidenceEntry[][] = [];
  let current: EvidenceEntry[] = [];
  let size = 0;
  for (const entry of entries) {
    const length =
      typeof entry === 'string'
        ? entry.trim().length
        : (entry.question?.length ?? 0) + (entry.choices?.join('').length ?? 0) + entry.text.length;
    if (!length) continue;
    if (current.length && (size + length > 50_000 || current.length >= 500)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

// Derive a stable UUID from the exact input. A changed transcript, reset interview,
// or changed Step 2 input creates a new identity. Lost responses can reuse it.
export function whispererUuid(namespace: string, input: unknown): string {
  const bytes = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(JSON.stringify(input))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
