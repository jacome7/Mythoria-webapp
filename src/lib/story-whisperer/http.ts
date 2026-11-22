import { z } from 'zod';
import { BiographerError } from '@/db/services/biographer';

const projectHeader = 'x-story-whisperer-project';

export function expectedWhispererProject(request: Request): string;
export function expectedWhispererProject(request: Request, required: false): string | undefined;
export function expectedWhispererProject(request: Request, required = true) {
  const value = request.headers.get(projectHeader);
  if (!value && !required) return undefined;
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new BiographerError('Invalid Story Whisperer project', 400);
  return result.data;
}
