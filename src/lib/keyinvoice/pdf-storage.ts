import { createHash } from 'crypto';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();

function getBucketName(): string {
  return process.env.STORAGE_BUCKET_NAME || 'mythoria-generated-stories';
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
}

export async function storeFiscalDocumentPdf(params: {
  authorId: string;
  orderId: string;
  fullDocNumber?: string | null;
  pdfBase64: string;
}): Promise<{ storagePath: string; sha256: string; size: number }> {
  const buffer = Buffer.from(params.pdfBase64, 'base64');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const fileName = `${safeSegment(params.fullDocNumber || params.orderId)}.pdf`;
  const storagePath = `fiscal-documents/${params.authorId}/${params.orderId}/${fileName}`;

  await storage
    .bucket(getBucketName())
    .file(storagePath)
    .save(buffer, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'private, max-age=0, no-store',
        metadata: {
          sha256,
          orderId: params.orderId,
          authorId: params.authorId,
        },
      },
    });

  return { storagePath, sha256, size: buffer.length };
}

export async function downloadFiscalDocumentPdf(storagePath: string): Promise<Buffer> {
  const [buffer] = await storage.bucket(getBucketName()).file(storagePath).download();
  return buffer;
}
