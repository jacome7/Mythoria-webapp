import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { fiscalDocumentEvents, fiscalDocuments, type FiscalDocument } from '@/db/schema';

const recoveryUnblocked = () =>
  or(isNull(fiscalDocuments.recoveryState), eq(fiscalDocuments.recoveryState, 'cancelled'));

// Used directly in the UPDATE, so competing recovery reservations serialize on the same row.
export function issueClaimPredicate(documentId: string) {
  return and(
    eq(fiscalDocuments.id, documentId),
    inArray(fiscalDocuments.status, ['pending', 'failed']),
    recoveryUnblocked(),
    sql`(${fiscalDocuments.docNum} is not null or not exists (select 1 from ${fiscalDocumentEvents} where ${fiscalDocumentEvents.fiscalDocumentId} = ${fiscalDocuments.id} and ${fiscalDocumentEvents.eventType} = 'insert_document_requested'))`,
  );
}

export function issueFence(document: Pick<FiscalDocument, 'id' | 'attemptCount'>) {
  return and(
    eq(fiscalDocuments.id, document.id),
    eq(fiscalDocuments.status, 'issuing'),
    eq(fiscalDocuments.attemptCount, document.attemptCount),
    recoveryUnblocked(),
  );
}
