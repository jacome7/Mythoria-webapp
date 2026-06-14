import { NextRequest, NextResponse } from 'next/server';

import { fiscalDocumentService } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { downloadFiscalDocumentPdf } from '@/lib/keyinvoice/pdf-storage';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await params;
    const document = await fiscalDocumentService.getForAuthor(documentId, author.authorId);
    if (!document || document.status !== 'issued' || !document.pdfStoragePath) {
      return NextResponse.json({ error: 'Fiscal document PDF not found' }, { status: 404 });
    }

    const pdf = await downloadFiscalDocumentPdf(document.pdfStoragePath);
    const filename = `${document.fullDocNumber || document.id}.pdf`.replace(
      /[^a-zA-Z0-9._-]+/g,
      '-',
    );

    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdf.byteLength),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (error) {
    console.error('Error serving fiscal document PDF:', error);
    return NextResponse.json({ error: 'Failed to serve fiscal document PDF' }, { status: 500 });
  }
}
