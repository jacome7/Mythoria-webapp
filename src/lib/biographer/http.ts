import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { ZodError, z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { BiographerError } from '@/db/services/biographer';
import { biographerEnabled } from './validation';
export async function owner(readOnly = false) {
  if (!readOnly && !biographerEnabled()) throw new BiographerError('Not found', 404);
  const author = await getCurrentAuthor();
  if (!author) throw new BiographerError('Authentication required', 401);
  return author;
}
export function internal(request: Request) {
  const expected = process.env.BIOGRAPHER_INTERNAL_API_KEY;
  const received = request.headers.get('x-api-key');
  if (
    !expected ||
    !received ||
    Buffer.byteLength(expected) !== Buffer.byteLength(received) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  )
    throw new BiographerError('Unauthorized', 401);
}
export async function body(request: Request) {
  const length = Number(request.headers.get('content-length'));
  if (length > 3000000) throw new BiographerError('Request too large', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Missing JSON body');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 3000000) {
        await reader.cancel();
        throw new BiographerError('Request too large', 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function id(value: string) {
  return z.uuid().parse(value);
}
export async function handle(action: () => Promise<unknown>) {
  try {
    return NextResponse.json(await action(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof BiographerError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    return NextResponse.json(
      { error: 'Unable to save your changes. Please retry.' },
      { status: 500 },
    );
  }
}
