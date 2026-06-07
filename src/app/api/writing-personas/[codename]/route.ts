import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { writingPersonaCreateSchema } from '@/lib/writing-persona-validation';
import { writingPersonaService } from '@/db/services/writing-personas';

type RouteContext = {
  params: Promise<{ codename: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { codename } = await params;
    const body = await request.json();
    const input = writingPersonaCreateSchema.parse(body);
    const persona = await writingPersonaService.update(author.authorId, codename, input);

    if (!persona) {
      return NextResponse.json({ error: 'Writing persona not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, persona });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid writing persona data', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Error updating writing persona:', error);
    return NextResponse.json({ error: 'Failed to update writing persona' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { codename } = await params;
    const deleted = await writingPersonaService.delete(author.authorId, codename);

    if (!deleted) {
      return NextResponse.json({ error: 'Writing persona not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting writing persona:', error);
    return NextResponse.json({ error: 'Failed to delete writing persona' }, { status: 500 });
  }
}
