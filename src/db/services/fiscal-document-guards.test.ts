import { PgDialect } from 'drizzle-orm/pg-core';

import { issueClaimPredicate, issueFence } from './fiscal-document-guards';

const dialect = new PgDialect();

describe('fiscal worker SQL guards', () => {
  it('claims only eligible rows and blocks ambiguous inserts in the same predicate', () => {
    const query = dialect.sqlToQuery(issueClaimPredicate('doc-1')!);
    expect(query.params).toEqual(['doc-1', 'pending', 'failed', 'cancelled']);
    expect(query.sql).toMatch(/"fiscal_documents"\."status" in \(\$2, \$3\)/);
    expect(query.sql).toMatch(
      /"fiscal_documents"\."recovery_state" is null or "fiscal_documents"\."recovery_state" = \$4/,
    );
    expect(query.sql).toMatch(
      /"fiscal_documents"\."doc_num" is not null or not exists \(select 1 from "fiscal_document_events"/,
    );
    expect(query.sql).toContain(
      '"fiscal_document_events"."fiscal_document_id" = "fiscal_documents"."id"',
    );
    expect(query.sql).toContain("'insert_document_requested'");
  });

  it('fences every worker write by row, issuing status, generation, and recovery state', () => {
    const query = dialect.sqlToQuery(issueFence({ id: 'doc-1', attemptCount: 7 })!);
    expect(query.params).toEqual(['doc-1', 'issuing', 7, 'cancelled']);
    expect(query.sql).toContain('"fiscal_documents"."id" = $1');
    expect(query.sql).toContain('"fiscal_documents"."status" = $2');
    expect(query.sql).toContain('"fiscal_documents"."attempt_count" = $3');
    expect(query.sql).toMatch(
      /"fiscal_documents"\."recovery_state" is null or "fiscal_documents"\."recovery_state" = \$4/,
    );
  });
});
