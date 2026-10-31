# Tell Your Story mobile layout

The five steps share a mobile action bar at widths up to 768px. The header is 52px high only on Tell Your Story routes. Progress uses the existing localized sentence, with the current step wrapped in a rich-text `current` tag in all five locales.

## Layout and navigation

`WizardActionBar` renders one set of controls: in the document flow on desktop and in a body portal on mobile, outside card stacking contexts. A measured spacer reserves its height, including wrapped labels and safe-area padding. VisualViewport resize and scroll events move the bar above the keyboard area. Open dialogs and modal overlays hide the mobile bar. The wizard stylesheet removes duplicate card decoration and widens fields without changing other product routes.

`StepNavigation` preserves validation callbacks and guards pending submissions. Disabled links prevent navigation. Step 3 returns to the saved step 2 journey; edit mode keeps its existing destination. Step 5 uses the same generation handler and credit checks through the shared bar. No generation or database contracts change.

## Local verification — 2026-10-31

- Browser integrated, authenticated pt-PT: five steps at 393px; 360px and 430px checks found one fixed bar, a 52px header and no horizontal overflow. Step 2 also checked at 740×360 and desktop; desktop header remains approximately 66px and actions are in normal flow.
- Returning from step 3 opens the saved model directly. Cancelling the template exit confirmation preserves the model, and the bar is absent while the dialog is open. The final character action is reachable above the navigation bar.
- Unit coverage includes disabled links, failed validation, duplicate-click suppression, modal visibility, visual viewport keyboard offsets and the emphasized progress number in all five translation bundles. Existing step 2 recovery tests remain active.
- Physical keyboard behavior and safe-area rendering on a real iOS/Android device remain device checks. No generation button was submitted and no paid provider calls, database fixtures, migrations or deployment were used.

Checks: lint, typecheck, production build and locale parity passed. Focused navigation/recovery coverage passed (45 tests). The full Jest run passed 1,326 tests with 13 skipped and one failure in the unrelated SurveyRenderer intro copy assertion. Repository-wide formatting also reports existing issues outside this change; changed wizard files are formatted. The keyboard-aware bar has separate simulated VisualViewport coverage; physical-device validation is still required.

## Screenshots

The local before/after captures are in the current chat's visualization directory. These paths are local review evidence, not deployed assets.

| Step       | Before                                                                                                                                | After                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Author     | [Before](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-audit/01-autor.jpg)       | [After](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-after/01-autor.jpg)       |
| Story      | [Before](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-audit/02-modelo.jpg)      | [After](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-after/02-historia.jpg)    |
| Characters | [Before](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-audit/03-personagens.jpg) | [After](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-after/03-personagens.jpg) |
| Plot       | [Before](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-audit/04-enredo.jpg)      | [After](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-after/04-enredo.jpg)      |
| Review     | [Before](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-audit/05-revisao.jpg)     | [After](C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/wizard-mobile-after/05-revisao.jpg)     |
