import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { storyInputMaxBytes, storyInputMaxJsonBytes, StoryInputTooLarge } from './story-input-size';

export class InvalidStoryInput extends Error {}
const storage = new Storage();

async function readBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new StoryInputTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidStoryInput();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new StoryInputTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!length) throw new InvalidStoryInput();
  return Buffer.concat(chunks, length);
}

export async function readStoryInput(request: Request) {
  let mime = request.headers.get('content-type') || '';
  let kind = request.headers.get('x-media-kind');
  let bytes: Buffer;
  if (mime.split(';')[0].trim().toLowerCase() === 'application/json') {
    const json = await readBody(request, storyInputMaxJsonBytes);
    let body;
    try {
      body = JSON.parse(json.toString());
    } catch {
      throw new InvalidStoryInput();
    }
    if (typeof body?.dataUrl !== 'string' || typeof body.contentType !== 'string')
      throw new InvalidStoryInput();
    kind = body.kind;
    mime = body.contentType;
    let encoded = body.dataUrl;
    if (encoded.startsWith('data:')) {
      const prefix = /^data:([^,]+);base64,/i.exec(encoded);
      if (!prefix) throw new InvalidStoryInput();
      mime = prefix[1];
      encoded = encoded.slice(prefix[0].length);
    }
    if (encoded.length > 4 * Math.ceil(storyInputMaxBytes / 3)) throw new StoryInputTooLarge();
    if (!encoded || /[^A-Za-z0-9+/=]/.test(encoded)) throw new InvalidStoryInput();
    bytes = Buffer.from(encoded, 'base64');
    if (bytes.length > storyInputMaxBytes) throw new StoryInputTooLarge();
  } else {
    bytes = await readBody(request, storyInputMaxBytes);
  }
  if ((kind !== 'image' && kind !== 'audio') || !bytes.length) throw new InvalidStoryInput();
  const mediaType = mime.split(';')[0].trim().toLowerCase();
  if (!mediaType.startsWith(kind + '/') || !/^(image|audio)\/[a-z\d.+-]+$/.test(mediaType))
    throw new InvalidStoryInput();
  if (kind === 'image') {
    try {
      bytes = await sharp(bytes, { failOn: 'none' })
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new InvalidStoryInput();
    }
    return { kind, bytes, mime: 'image/jpeg', extension: 'jpg' };
  }
  const extension = /mpeg|mp3/.test(mediaType)
    ? 'mp3'
    : /m4a|mp4|aac/.test(mediaType)
      ? 'm4a'
      : mediaType.includes('ogg')
        ? 'ogg'
        : mediaType.includes('webm')
          ? 'webm'
          : 'wav';
  return { kind, bytes, mime: mediaType, extension };
}

export async function saveStoryInput(
  authorId: string,
  assetId: string,
  input: Awaited<ReturnType<typeof readStoryInput>>,
) {
  const bucket = storage.bucket(process.env.STORAGE_BUCKET_NAME || 'mythoria-generated-stories');
  const objectPath = `${authorId}/inputs/${assetId}.${input.extension}`;
  const file = bucket.file(objectPath);
  try {
    await file.save(input.bytes, {
      metadata: { contentType: input.mime },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 412) throw error;
  }
  return {
    success: true,
    authorId,
    kind: input.kind,
    objectPath,
    publicUrl: `https://storage.googleapis.com/${bucket.name}/${objectPath}`,
  };
}
