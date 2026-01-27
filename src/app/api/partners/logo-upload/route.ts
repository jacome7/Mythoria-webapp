import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { imageSize } from 'image-size';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_LOGO_DIMENSION = 2048;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const PUBLIC_BUCKET_NAME = process.env.PUBLIC_STORAGE_BUCKET_NAME || 'mythoria-public';

const storage = new Storage();

const getFileExtension = (contentType: string) => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Logo file is required' }, { status: 400 });
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 4MB limit' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = imageSize(buffer);
    const width = dimensions.width ?? 0;
    const height = dimensions.height ?? 0;

    if (!width || !height) {
      return NextResponse.json(
        { success: false, error: 'Unable to read image dimensions' },
        { status: 400 },
      );
    }

    if (Math.max(width, height) > MAX_LOGO_DIMENSION) {
      return NextResponse.json(
        { success: false, error: 'Image exceeds 2048px maximum dimension' },
        { status: 400 },
      );
    }

    const extension = getFileExtension(file.type);
    const objectPath = `partners/${randomUUID()}.${extension}`;
    const bucket = storage.bucket(PUBLIC_BUCKET_NAME);
    const gcsFile = bucket.file(objectPath);

    await gcsFile.save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${PUBLIC_BUCKET_NAME}/${objectPath}`;

    return NextResponse.json({ success: true, publicUrl, objectPath });
  } catch (error) {
    console.error('Partner logo upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
