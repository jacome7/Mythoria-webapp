# Mythoria codebase Janitor review

## Scope

Compared the four requested pinned Git trees for the Web App, Admin, Story Generation Workflow, and Notification Engine. Counts come from the reviewed Git objects, before adding this report. Source line counts are nonblank lines. Tests, documentation, and operations scripts are counted separately from production source.

## Aggregate changes

| Service                   | Tracked paths before → after | Added / deleted / modified | Production source lines before → after | Test lines before → after | Documentation lines before → after | Operations script lines before → after |
| ------------------------- | ---------------------------: | -------------------------: | -------------------------------------: | ------------------------: | ---------------------------------: | -------------------------------------: |
| Web App                   |                4,066 → 4,066 |                  0 / 0 / 4 |                      127,570 → 127,535 |           31,488 → 31,488 |                    23,006 → 23,006 |                        10,623 → 10,623 |
| Admin                     |                    531 → 528 |                  0 / 3 / 2 |                        54,160 → 54,075 |             5,069 → 5,069 |                      8,636 → 8,636 |                          3,323 → 3,323 |
| Story Generation Workflow |                    429 → 429 |                  1 / 1 / 5 |                        33,411 → 33,411 |             9,887 → 9,887 |                      4,246 → 4,231 |                          3,167 → 3,167 |
| Notification Engine       |                    410 → 410 |                  0 / 0 / 2 |                        12,707 → 12,516 |             4,242 → 4,269 |                      1,165 → 1,165 |                          1,874 → 1,874 |

The Workflow source tree has no production-source line change in this comparison. Its tracked ICC profiles total 3,658,581 bytes before and 7,317,011 bytes after, a net increase of 3,658,430 bytes.

## Package readiness

All four services retain the same package version in their package manifest and lockfile. Each uses lockfile version 3 and declares Node.js 24.18.1. The comparison includes direct dependencies and lockfile package records.

| Service                   | Package version | Direct dependencies | Locked package records |
| ------------------------- | --------------: | ------------------: | ---------------------: |
| Web App                   |           1.0.0 |                  75 |                  1,668 |
| Admin                     |           0.3.0 |                  58 |                  1,129 |
| Story Generation Workflow |           0.5.0 |                  46 |                    865 |
| Notification Engine       |           0.3.0 |                  40 |                  1,080 |

No direct dependency declarations or locked package versions changed in the compared trees.

## Validation and next steps

The four final unit runs passed 3,220 tests. Additional isolated PostgreSQL checks passed for fiscal recovery, delivery bookkeeping and referral processing. Both local Web App builds retained the mobile reader footer breakpoint.

Admin’s clean install initially failed on an obsolete UI patch. After removing it and explicitly preserving its two generated style utilities, a fresh offline npm ci passed. The generated stylesheet was byte-identical, and Chrome retained focus and hover behavior.

Release verification is partial. Two Web App browser specifications failed in the isolated identity and networking setup on the original and final revisions. The staff app passed its webpack build on both revisions. Its default Turbopack build and full formatting check were blocked by sandbox restrictions. Provider acceptance and staging journeys still require separate validation.

The installed compiler is TypeScript 6.0.3. A disposable TypeScript 7.0.2 trial passed the Web App application check and the Notification Engine application and tools checks. Prepare the remaining compiler configurations, fix the existing test-typing baseline and establish Jest and ESLint support before changing the platform compiler. [TypeScript package](https://registry.npmjs.org/typescript/7.0.2)

Detailed findings delivered privately to the owner.
