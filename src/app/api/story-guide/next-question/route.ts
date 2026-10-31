import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import { isStoryTemplatesEnabledForAuthor } from '@/lib/story-templates/feature';
import { getStoryTemplate } from '@/lib/story-templates/catalog';
import {
  fallbackQuestion,
  guideQuestionSchema,
  guideRequestSchema,
} from '@/lib/story-templates/journey';

export async function POST(request: NextRequest) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isStoryTemplatesEnabledForAuthor(author))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 32_000)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const parsed = guideRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const input = parsed.data;
  const template = getStoryTemplate(input.templateId, input.locale);
  if (
    !template ||
    template.version !== input.templateVersion ||
    !template.modes.includes(input.mode)
  ) {
    return NextResponse.json({ error: 'Unknown template or mode' }, { status: 400 });
  }
  const fallback = () =>
    NextResponse.json({
      revision: input.revision,
      source: 'fallback',
      question: fallbackQuestion(template, input.previousQuestions, input.mode === 'memory'),
    });
  try {
    const response = await sgwFetch('/ai/text/story-guide', {
      method: 'POST',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(11_000)]),
      body: JSON.stringify({
        authorId: author.authorId,
        guideSessionId: input.guideSessionId,
        revision: input.revision,
        locale: input.locale,
        template: {
          id: template.id,
          version: template.version,
          premise: template.premise,
          mode: input.mode,
        },
        answers: input.answers,
        previousQuestions: input.previousQuestions,
        preferences: input.preferences,
        premise: input.premise,
        contribution: input.contribution,
        ...(input.photoAnswers ? { photoAnswers: true } : {}),
      }),
    });
    if (!response.ok) return fallback();
    const result = await response.json();
    if (result.revision !== input.revision) return fallback();
    if (result.question === null)
      return NextResponse.json({ revision: input.revision, source: 'ai', question: null });
    const question = guideQuestionSchema.safeParse(result.question);
    if (!question.success || input.previousQuestions.includes(question.data.text))
      return fallback();
    const { photoTarget, customOnly: _customOnly, ...plainQuestion } = question.data;
    return NextResponse.json({
      revision: input.revision,
      source: 'ai',
      question: {
        ...plainQuestion,
        ...(input.photoAnswers && photoTarget ? { photoTarget } : {}),
        suggestedChoiceId: input.mode === 'memory' ? null : question.data.suggestedChoiceId,
      },
    });
  } catch {
    // Guidance is optional. Do not log the request, provider response, or personal answers.
    return fallback();
  }
}
