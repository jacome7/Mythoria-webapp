import { z } from 'zod';
import {
  answeredQuestions,
  chunkEvidence,
  joinEvidence,
  modelHistory,
  questionOptions,
  saveQuestionOptions,
  whispererUuid,
} from './seed';

describe('Story Whisperer evidence', () => {
  it('bears forward only questions the author answered and respects excluded, interrupted and pending turns', () => {
    const entries = answeredQuestions(
      [
        { role: 'user', text: 'A minha mulher.' },
        { role: 'assistant', text: 'Em que ano se conheceram?' },
        { role: 'user', text: 'Talvez em 1998.' },
        { role: 'assistant', text: 'Foi em Sintra?' },
        { role: 'user', text: 'Sim', included: false },
        { role: 'user', text: 'Chama-se Inês.' },
        { role: 'assistant', text: 'Paris?', interrupted: true },
        { role: 'user', text: 'Na escola.' },
        { role: 'assistant', text: 'Braga?' },
        { role: 'user', text: 'Ainda a gravar', final: false },
      ],
      'Sobre quem gostaria de escrever?',
    );
    expect(entries).toEqual([
      { question: 'Sobre quem gostaria de escrever?', text: 'A minha mulher.' },
      { question: 'Em que ano se conheceram?', text: 'Talvez em 1998.' },
      { text: 'Chama-se Inês.' },
      { text: 'Na escola.' },
    ]);
  });
  it('preserves ordered options for a segunda across the opening, follow-ups and the outline', () => {
    const first = { id: 'q1', choices: ['Lisboa', 'Porto'] };
    const next = saveQuestionOptions({ id: 'q2', choices: ['Rua', 'Jardim'] }, first);
    const prompt = { id: 'q1', role: 'assistant', text: 'Em que cidade?' };
    const opening = { question: 'Que episódio?', choices: ['Um jogo', 'Uma viagem'] };
    const reply = { role: 'user', text: 'A segunda.' };
    const options = questionOptions(prompt, next);
    expect(options?.choices).toEqual(first.choices);
    const evidence = answeredQuestions([reply, { ...prompt, ...options }, reply], opening);
    expect(
      joinEvidence(evidence)
        .split('\n\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([
      {
        interviewerQuestion: opening.question,
        interviewerChoices: opening.choices,
        authorReply: reply.text,
      },
      {
        interviewerQuestion: prompt.text,
        interviewerChoices: first.choices,
        authorReply: reply.text,
      },
    ]);
    expect(questionOptions({ ...prompt, included: false }, next)).toBeUndefined();
    expect(questionOptions({ ...prompt, originalText: 'Que ano?' }, next)).toBeUndefined();
    expect(questionOptions({ ...prompt, id: 'unrelated' }, next)).toBeUndefined();
    expect(answeredQuestions([{ ...prompt, ...options, included: false }, reply], opening)).toEqual(
      [{ text: reply.text }],
    );
  });

  it('prevents the assessment and live history from attaching a discarded reply’s choices to another answer', () => {
    const question = { role: 'assistant', text: 'Que lugar?', choices: ['Porto', 'Lisboa'] };
    const discarded = { role: 'user', text: 'Porto.', included: false };
    const later = { role: 'user', text: 'A segunda.' };
    expect(modelHistory([question, discarded, later])).toEqual([later]);
    expect(modelHistory([question, later])).toEqual([question, later]);
    expect(modelHistory([question])).toEqual([question]);
  });

  it('preserves individual contributions and their order', () => {
    const entries = [' Earlier note. ', '', ' First story event. ', 'Name confirmed in a caption.'];
    expect(joinEvidence(entries)).toBe(
      'Earlier note.\n\nFirst story event.\n\nName confirmed in a caption.',
    );
  });

  it('keeps all oversized evidence across bounded SGW batches', () => {
    const entries = ['a'.repeat(40000), 'b'.repeat(16000), 'c'.repeat(40000), 'Last detail.'];
    const chunks = chunkEvidence(entries);
    expect(chunks.flat()).toEqual(entries);
    expect(chunks.every((chunk) => joinEvidence(chunk).length <= 60000)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('reuses a valid request UUID for identical inputs and separates changes and retries', () => {
    const input = ['author', 'story', 'project', { revision: 2, brief: 'The swimming lesson' }];
    const first = whispererUuid('whisperer-structure', input);
    expect(z.uuid().safeParse(first).success).toBe(true);
    expect(whispererUuid('whisperer-structure', input)).toBe(first);
    expect(whispererUuid('whisperer-structure', [...input, { retryOf: first }])).not.toBe(first);
    expect(whispererUuid('whisperer-question', input)).not.toBe(first);
  });
});
