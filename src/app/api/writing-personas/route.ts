import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { writingPersonaCreateSchema } from '@/lib/writing-persona-validation';
import { WRITING_PERSONA_MAX_SAVED } from '@/types/writing-persona';
import { writingPersonaService } from '@/db/services/writing-personas';

export async function GET() {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const personas = await writingPersonaService.listByAuthor(author.authorId);

    return NextResponse.json({ success: true, personas });
  } catch (error) {
    console.error('Error fetching writing personas:', error);
    return NextResponse.json({ error: 'Failed to fetch writing personas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const input = writingPersonaCreateSchema.parse(body);
    const personaCount = await writingPersonaService.countByAuthor(author.authorId);

    if (personaCount >= WRITING_PERSONA_MAX_SAVED) {
      return NextResponse.json(
        { error: `You can save up to ${WRITING_PERSONA_MAX_SAVED} writing personas.` },
        { status: 409 },
      );
    }

    const persona = await writingPersonaService.create(author.authorId, input);

    return NextResponse.json({ success: true, persona }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid writing persona data', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Error creating writing persona:', error);
    return NextResponse.json({ error: 'Failed to create writing persona' }, { status: 500 });
  }
}
