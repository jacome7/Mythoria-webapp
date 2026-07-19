# Search indexing remediation operations

This runbook covers the operational checks that accompany Mythoria's canonical routing, SEO metadata, sitemap, robots, and database uniqueness controls.

## Release invariants

- Production releases originate from a clean `master` worktree.
- The image is tagged with the full Git SHA and `latest`; Cloud Run deploys the SHA tag.
- The container OCI revision label, Cloud Run `git-sha` label, and `/api/health` `gitSha` must all identify the release commit.
- `/sitemap.xml` fails closed with `503` and `Retry-After` when any source query or integrity check fails.
- Every submitted sitemap URL must be an immediate `200`, indexable, and self-canonical.

## Database guard

The translation uniqueness migration deletes one row from the shared development/production database. Always create and verify an on-demand Cloud SQL backup first.

```powershell
gcloud sql backups create --instance=mythoria-db --project=oceanic-beach-460916-n5 --description=pre-search-indexing-remediation-YYYYMMDD
npm run db:seo-preflight
npm run db:migrate
npm run db:seo-postflight
```

The preflight accepts only the two known, authored-content-identical German rows. The migration retains `959981e0-d84c-4061-8382-f3b1979bf114`, removes `67346182-a141-494d-bcd5-f9eedb0ed4d0`, asserts both duplicate queries are empty, and adds the two unique indexes in the same migration transaction.

## Release verification

Run the repository checks before deployment:

```powershell
npm run i18n:keys
npm run i18n:parity
npm run check:env
npm run format
npm run lint
npm run typecheck
npm run build
npm run test
```

After deployment, run:

```powershell
npm run test:seo:prod
```

The smoke suite records the health SHA, follows the canonical redirect contracts with no automatic redirect handling, validates every sitemap URL and reciprocal alternate, confirms representative private routes remain out of the sitemap and `noindex`, verifies the landing-page internal-link graph and IndexNow key, tests representative AI crawler user-agents, and verifies missing and wrong-locale blog behavior.

## Search Console and monitoring

Submit only `https://mythoria.pt/sitemap.xml`. After a release that creates or substantially changes landing pages, use URL Inspection's live test and request indexing once for each canonical URL. Never submit redirects, locale duplicates, private routes, or repeated daily requests. Review redirect-error, soft-404, accidental-noindex and Google-selected-canonical groups after Google recrawls the site.

Notify IndexNow participants only for new, substantially updated, or removed registered landing pages:

```powershell
npm run seo:indexnow -- --dry-run
npm run seo:indexnow
```

An HTTP `200` or `202` means the batch was received, not that it was indexed. The public protocol key is served from the root path named in `src/lib/indexnow.ts`; it is intentionally not a secret. IndexNow is not wired to every deployment to avoid resubmitting unchanged URLs.

The wildcard robots policy permits search and citation crawlers. Bot-specific groups allow editorial content while excluding known account, creation, payment, API, and management routes from `GPTBot`, `ClaudeBot`, and `Google-Extended`. Keep Googlebot able to read HTML `noindex` directives.

Cloud Run request logs provide the crawler baseline. Generate the last 72-hour summary with:

```powershell
npm run seo:crawlers
```

User-agent strings can be forged. Before treating a request as an authentic crawler visit, compare the logged remote IP with the official provider-published ranges or verification method. Track ChatGPT referrals through the existing analytics attribution, including `utm_source=chatgpt.com`.

For six weeks after release, review weekly:

- sitemap generation success, entry count, and duration;
- non-200 sitemap targets and redirect loops;
- Googlebot status-code distribution;
- submitted versus indexed page counts;
- canonical and hreflang validation errors.
- landing-page discovery, last-crawl dates and Google-selected canonicals;
- verified AI search crawler visits and cited/referral traffic;
- Bing Webmaster Tools AI Performance citations when available.
