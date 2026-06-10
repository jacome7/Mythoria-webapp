# Mobile UX Copy Review - English Locale

Reviewed on: 2026-06-10  
Locale: `en-US`  
Viewport used: mobile, `390 x 844`  
Method: navigated the running local app with the integrated browser and reviewed visible copy, controls, form labels, empty/error states, and mobile target sizes.

## Scope Notes

- Public static pages were reviewed directly.
- Authenticated pages were reviewed in the current browser session. Some rendered only header/footer or required missing state, which should be treated as a UX issue for first-time or interrupted users.
- Dynamic pages were reviewed with real public examples where available. Routes that require a real `storyId`, `token`, or authenticated draft are listed with recommendations for their fallback and empty states.
- The review focuses only on English copy and mobile clarity. It does not evaluate visual brand direction beyond mobile usability.

## Global Mobile Suggestions

- Keep the first-screen action consistent. Use one primary CTA label across public pages, such as `Create your story`, rather than mixing `Write your own story`, `Tell Your Story`, `Get Started`, and `Create a New Story`.
- Use less fantasy jargon in task-critical copy. Playful language works for brand moments, but instructions, errors, payment, deletion, and support should be direct first, playful second.
- Add short "What happens next" helper text before costly or irreversible actions: generating a story, buying credits, deleting an account, printing, and sharing publicly.
- Use visible section summaries on long pages. FAQ, pricing, privacy, terms, about, partners, and contact are long on mobile and need anchors, sticky section jump links, or collapsible summaries.
- Replace unclear loading states with action-specific states. `Loading...` should become `Loading your story...`, `Checking this share link...`, or `Preparing the editor...`.

## Home - `/en-US`

- Simplify hero copy from `Turn anyone into the hero of a beautifully illustrated book - for children, grown-ups or entire teams.` to `Create a personalized illustrated book for a child, adult, family, or team.`
- Change the primary CTA from `Write your own story` to `Create your story` for a broader first-time action.
- Shorten occasion cards:
  - `Kids`: `Make a child the hero of a magical adventure.`
  - `Groups & Yearbooks`: `Turn team or class memories into a keepsake.`
  - `Adults`: `Turn love stories, trips, or memories into an illustrated book.`
  - `Companies`: `Create branded storybooks for customers or employees.`
- The `What drives us?` section is warm but long. Add a two-line summary first, then keep the fuller story lower on the page.
- The `With Mythoria, creating your own story is easy` section says `Log in` as step one. For new users, say `Create or sign in to your account` so it matches both first-time and returning flows.
- Step 5 says users can receive an `eBook, audiobook, or printed book`, but credits/pricing appear later. Add `Costs are shown before you generate or order anything.`
- Add a compact `Start in 3 ways` row near the CTA: `Write`, `Upload a drawing`, `Record your idea`.

## Get Inspired - `/en-US/get-inspired`

- Rename `Featured Stories` to `Story examples` or `Explore story examples`; it is clearer for first-time users.
- The subtitle `Stories that have inspired families around the world` is pleasant but vague. Consider `Browse real stories by age, art style, and language.`
- Add an `English only` filter chip by default when the user is on `/en-US`, or explain that examples may appear in other languages.
- Card CTA `View Story` is clear, but the button height is small on mobile. Increase tap height to at least `44px`.
- Empty image links on story cards should have accessible text such as `Open {storyTitle}`.
- Add a short helper under filters: `Use filters to find examples similar to the book you want to create.`
- Story metadata is useful but dense. Use compact chips for `Audience`, `Style`, and `Language` with consistent order.

## Tell Your Story Step 1 - `/en-US/tell-your-story/step-1`

- Simplify the heading from `Chapter 1 - The Author` to `Step 1: Author`.
- Shorten intro to `Tell us who should be credited as the author. You can use your name, a family name, or a pen name.`
- Change `Author Name(s) *` to `Author name` and move required information into helper text or validation.
- `Who should be credited as the author of this story?` is clear. Keep it.
- Change `Dedication Message Optional` to `Dedication message (optional)` for easier scanning.
- Add an example below dedication: `For Sofia, who always finds magic in small things.`
- The `Next` button should say `Next: Story idea` so users know what comes next.

## Tell Your Story Step 2 - `/en-US/tell-your-story/step-2`

- Simplify heading to `Step 2: Story idea`.
- Intro can be shorter: `Start with text, a drawing/photo, or your voice.`
- Tab labels should use words only or icon + word with the icon decorative. Current `Write`, `Image`, `Record` is good; avoid emoji-only meaning.
- Replace `You can create your story by drawing it, recording it, or simply writing it down.` with `Tell us the idea. A few lines are enough.`
- Replace `Oompa-Loompas will work hard...` with task-focused copy: `We will use your text, image, or audio to suggest characters, settings, and themes.`
- Add a visible progress reassurance: `You can edit everything later.`
- If characters are loading, show an end state after failure: `We could not load saved characters. You can continue without them.`
- The `Next` button should say `Next: Characters`.

## Tell Your Story Step 3 - `/en-US/tell-your-story/step-3`

- Direct navigation redirected to step 1, so add a state message if prerequisites are missing: `Start with the author step first so we can save your story.`
- Simplify heading to `Step 3: Characters`.
- Change intro to `Add the people, animals, or creatures who appear in your story.`
- Replace `Ready to meet your characters?` with `No characters yet`.
- Replace `Every great story needs amazing characters! Click "Add Character"...` with `Add a new character or choose one you saved before.`
- Keep `Create New Character` and `Use Existing Character`, but remove decorative emoji from the label on mobile if space is tight.
- Add helper text: `You can skip this if your idea already explains the characters.`
- The `Next` button should say `Next: Story details`.

## Tell Your Story Step 4 - `/en-US/tell-your-story/step-4`

- Direct navigation redirected to step 1, so show a prerequisite message if the user lands here without saved story state.
- Simplify heading to `Step 4: Story details`.
- Group fields into collapsible mobile sections, but show required fields first: `Title`, `Audience`, `Story style`, `Illustration style`, `Language`.
- Rename `Novel Style` to `Story style`; `novel` can be confusing when users are creating children's books or short books.
- Rename `Graphic Style` to `Illustration style`.
- Rename `Narrator Persona` to `Narrator voice`.
- Rename `Literary Age` elsewhere to `Reading age` or `Audience age`.
- `Custom Image Instructions` is powerful but technical. Use `Image notes (optional)` with helper text: `Describe anything the illustrations must include.`
- Add a sticky summary before `Review and generate`: `Nothing will be generated on the next screen. You can review cost first.`

## Tell Your Story Step 5 - `/en-US/tell-your-story/step-5`

- Direct navigation redirected to step 1, so use a clear prerequisite state rather than silently redirecting.
- Simplify heading to `Step 5: Review and generate`.
- `Chapter 5 - The Finale` is thematic, but less clear for a task screen. Use the functional title first and keep the theme in supporting copy if desired.
- Replace `Choose how you'd like to receive your story` with `Choose what to create now. You can add print or audio later.`
- Show a compact cost summary at the top: `eBook: 5 credits`, `Your balance: X credits`, `After generation: Y credits`.
- Change `Generate My Story` to `Generate story - 5 credits` when the cost is known.
- For insufficient credits, include a direct path: `You need {count} more credits. Buy credits or remove options.`
- Remove `Credit purchasing functionality is coming soon!` if buying credits is now available elsewhere.

## Pricing - `/en-US/pricing`

- Simplify heading from `Our Pricing` to `Pricing`.
- Add a plain-language first line: `Buy credits once. Spend them on eBooks, audio, edits, PDFs, and printed books.`
- The services table is dense on mobile. Convert it to grouped cards:
  - `Create`: eBook, extra chapter
  - `Improve`: AI text review, image generation
  - `Listen`: audiobook
  - `Print`: PDF, printed book, extra copy, shipping
- Clarify `Generate a digital eBook 5` as `Digital eBook: 5 credits`.
- Clarify `Online Printing (Print & Ship)` with `Printed book: 20 credits + shipping`.
- Change package CTAs from `Buy 5 Credits` to `Buy 5 credits - €5`.
- `Every new user gets 5 credits. Your first story is on us!` is strong; move it near the top on mobile.
- The FAQ list below pricing is useful but long. Collapse it behind `Pricing questions` with only the top 3 questions visible.
- Add a worked example: `Example: Create one eBook for 5 credits. Add an audiobook for 3 more.`

## Blog - `/en-US/blog`

- Change title from `The Blog` to `Mythoria Blog` or `Stories & Guides`.
- Subtitle `Chronicles from the realm of storytelling` is brandful but not clear. Use `Ideas, product updates, and practical guides for creating better stories.`
- Blog cards are text-heavy on mobile. Limit excerpts to 2-3 lines and keep `Continue Reading` visible.
- Add category or topic chips such as `Family`, `AI`, `Printing`, `Product`.
- `Continue Reading` tap target should be at least `44px` high.
- Add a search/filter only if the number of posts keeps growing.

## Blog Article - `/en-US/blog/[slug]`

- `Back to Chronicles` is less clear than `Back to blog`.
- `Share Chronicle` should be `Share article`.
- Keep date and read time, but make them visually secondary so the title leads.
- Add a short `In this article` block for long posts with headings.
- The article content is readable, but paragraphs are long on mobile. Use shorter paragraphs and more subheads.
- Add a bottom CTA that connects the article to action: `Create a story for a real-life moment`.

## FAQ - `/en-US/faqs`

- The page is very long on mobile. Keep only categories visible first, then expand questions within a selected category.
- Change `All Topics` to `All`.
- Keep `Search FAQs...`, but add helper text: `Search by topic, feature, or problem.`
- Avoid duplicate questions: both `I didn't receive the welcome email. Is my account active?` and `I didn't receive my welcome email. What should I do?` appear.
- Remove escaped newline artifacts (`\\n\\n`) from FAQ answers.
- Tone down very long answers. Start with the direct answer, then provide details.
- Add priority quick links: `Create account`, `Credits`, `Privacy`, `Printing`, `Contact support`.
- Ensure category buttons are full-width or comfortable chip targets on mobile.

## About Us - `/en-US/aboutUs`

- Simplify `Mythoria was born from something real simple` to `Mythoria began with a simple love of stories.`
- The page is heartfelt but long. Add a short top summary:
  - `We help people turn memories, ideas, and drawings into illustrated books.`
  - `We are a small team building Mythoria from Portugal.`
- `The People Behind the Dream` can be `Meet the team`.
- `The Mentor` copy says the dream has `legs to walk`; use `a strong foundation` or `a practical path forward`.
- `Our Oompa-Loompas` may be fun but can confuse first-time users. Rename to `The tools behind Mythoria` or explain it immediately.
- Add a clear CTA after the team section: `Start your story` or `Explore examples`.
- Use shorter paragraphs, especially in the mission section.

## Contact Us - `/en-US/contactUs`

- Simplify heading to `Contact us`.
- Replace `Send Us Your Owl (or just fill the form)` with `Send us a message`.
- The fantasy references are dense on a support page. Keep one playful line, then make categories direct.
- Rename `Create Support Ticket` to `Send message` or `Submit request`.
- Add expected response time: `We usually reply within X business days.`
- Put the contact form before partnership/recruitment content on mobile.
- `Bonus Credits Alert!` should be clearer: `Earn credits for helpful bug reports or ideas`.
- Avoid external fantasy references in category descriptions; they can distract users who just need help.
- The embedded FAQ makes the page very long. Show only `Top support questions` and link to the full FAQ.

## Partners - `/en-US/partners`

- Simplify hero copy from `From your screen to your hands...` to `Find local partners who can print your Mythoria book or offer related perks.`
- Clarify the two CTAs:
  - `Find a Location` -> `Find a partner near me`
  - `Partner With Us` -> `Apply to become a partner`
- `Local Services & Perks` can be `Partner directory`.
- Add a short explanation of partner types before the tabs: `Printers can produce your book. Attractions and retailers may offer local benefits.`
- Partner cards are long on mobile. Show name, location, type, and 1-2 lines first; reveal the full description under `Details`.
- Use `Website` instead of `Visit Website` if paired with `Get directions` to keep actions short.
- The application form is long. Split into steps or collapsible groups: `Your details`, `Business details`, `Partnership`.
- File upload needs helper text: accepted file types and max size.

## Privacy Policy - `/en-US/privacy-policy`

- The `At-a-Glance` summary is valuable but too dense. Convert it into 4 bullets:
  - `We collect account details and story inputs.`
  - `We store content in Google Cloud in the EU.`
  - `Story prompts may be processed by OpenAI Enterprise API.`
  - `You can delete your account and request your data rights.`
- Add a sticky or top table of contents for sections.
- Replace legal-heavy phrases where possible in summaries; keep full legal wording in details.
- The `Delete Account` link is important. Add a short note: `This permanently removes your account and stories.`
- Consider adding a `Contact privacy team` button near rights and contact sections.

## Delete Account - `/en-US/privacy-policy/delete-account`

- The page is clear and appropriately serious.
- Change the heading stack from `Delete Account` and `Delete Your Account` to a single title: `Delete your account`.
- Add `You will be asked to confirm before deletion` if there is a confirmation step.
- Add a safer alternative before the destructive button: `Need help instead? Contact support`.
- Make the deletion list more specific: `created books and stories`, `remaining credits`, `profile and preferences`.
- The button should stay destructive, but include a confirmation modal requiring the user to type `DELETE` or similar.

## Terms and Conditions - `/en-US/termsAndConditions`

- Add a short summary before the legal text: `These terms explain account rules, credits, AI-generated content, printing, refunds, and your rights.`
- Add a table of contents with jump links.
- The first paragraph is legally necessary but heavy. Move company details into a `Company details` block after the summary.
- Replace `audio-book` with `audiobook` for consistency.
- Make `Manage Cookie Settings` easier to find near the cookie section, not only near the end.
- Long legal sections should use more bullets and less paragraph density on mobile.

## Sign In - `/en-US/sign-in`

- The current signed-in session only showed the wrapper copy, not a full first-time sign-in form.
- Simplify `First time here? Create your account and start creating magical stories.` to `New to Mythoria? Create an account to start your first story.`
- Change `Create your account` to `Create account`.
- Keep `Welcome back! Please sign in to your account.`; it is clear.
- Add reassurance near sign-in: `Your stories, credits, and drafts stay with your account.`
- Ensure the actual Clerk form has visible labels on mobile and no controls below `44px`.

## Sign Up - `/en-US/sign-up`

- Simplify title from `Create Account` to `Create your account`.
- Expand the subtitle slightly: `Start with free credits and create your first personalized story.`
- Add clear benefits near the form:
  - `Save drafts`
  - `Keep stories private`
  - `Use your free credits`
- Include links to Terms and Privacy near account creation if not already shown inside Clerk.
- If the user is already signed in, show `You're already signed in` with `Go to My Stories` and `Create a story`.

## My Stories - `/en-US/my-stories`

- The page rendered only header/footer in the current browser state. This should never be the only visible state.
- If signed out, show the existing signed-out message: `Welcome to My Stories` plus `Sign in` and `Create account`.
- If signed in with no stories, show: `No stories yet` and a primary `Create your first story` button.
- If loading fails, show: `We could not load your stories. Try again.`
- Rename `Hi` in the translation file to a real heading such as `My stories`.
- Use mobile cards instead of a table for story rows.

## My Personas - `/en-US/my-personas`

- The page rendered only header/footer in the current browser state.
- Rename page to `My characters` if it stores reusable people/characters. `Personas` is less familiar to first-time users.
- Empty state should say: `No saved characters yet. Create one now or add characters while creating a story.`
- Primary CTA: `Create character`.
- Add a short explanation: `Saved characters can be reused in future stories.`
- Use mobile cards with `Name`, `Type`, and actions instead of a compact table.

## Profile - `/en-US/profile`

- The page rendered only header/footer in the current browser state.
- If signed out, show `Please sign in to view your profile` with a primary `Sign in` button.
- Simplify intro from `Welcome to your personal dashboard...` to `Manage your profile, contact details, credits, and preferences.`
- Rename `Your Profile Details` to `Profile details`.
- Rename `Your Creative Journey` to `Your activity`.
- Tone down playful text on settings screens. Users expect settings to be calm, direct, and predictable.
- Add visible save confirmation near the `Save Changes` button.

## Profile Onboarding - `/en-US/profile/onboarding`

- The page is too long for mobile as one continuous form. Split it into steps:
  - `Name and contact`
  - `Preferences`
  - `Story interests`
  - `Promo code`
- Simplify heading from `How should we address you?` to `What should we call you?`
- `Help us tailor your experience (Optional)` is clear; keep optional visible.
- Rename `Literary Age` to `Reading age` or `Age range`.
- Keep `A gift to get you started!`, but add the exact benefit: `You have 5 free credits.`
- Promo code text `Got a secret share...unlock extra magic` should become `Have a promo or referral code? Enter it here.`
- Long country dropdowns are painful on mobile. Add search or detect from locale/device where appropriate.
- Checkboxes should have larger tap areas and shorter labels.

## Credits and Payments - `/en-US/credits-and-payments`

- Simplify page title to `Credits`.
- Subtitle can become `Check your balance, buy credits, and review transactions.`
- Replace all-caps card headings:
  - `CURRENT BALANCE` -> `Current balance`
  - `RUNNING LOW?` -> `Need more credits?`
- `153 Credits available for use` should become `153 credits available`.
- `Check our packages` is secondary; use `See credit packages`.
- Transaction history is very long on mobile. Add filters: `All`, `Purchases`, `Used`, `Refunds`.
- Group repeated same-day transactions or make history collapsible.
- Add a short explanation: `Credits are used for generation, edits, audio, PDFs, and printing.`

## Buy Credits - `/en-US/buy-credits`

- Simplify subtitle from `Purchase credits to unlock premium features and create amazing stories.` to `Buy credits to create, edit, listen to, or print stories.`
- `Promo or referral code` is clear. Replace playful helper with `Enter a promo or referral code if you have one.`
- `Have a code?` button is too small. Make it a full-width mobile row or visible input toggle with `Enter code`.
- Package `Add` buttons are too small and generic. Use `Add 5 credits`, `Add 10 credits`, etc.
- Add value hints where useful: `Good for 1 eBook`, `Best value`, or `For several stories`.
- Cart empty state is clear. Add `Choose a package above to continue.`
- Fix `Back to Pricing` link to include locale: `/en-US/pricing`.

## Public Story Detail - `/en-US/p/[slug]`

- Reviewed with `/en-US/p/mythoria-a-vision-unfolding`.
- The story page is understandable, but action density is high on mobile: `Print`, `Download PDF`, `Start Reading`, `Create Your Own Story`, `Order Printed Book`, `Rate`, `Feedback`.
- Prioritize actions:
  - Primary: `Start reading`
  - Secondary: `Create your own story`
  - Tertiary menu: `Download PDF`, `Order print`, `Share`, `Feedback`
- Rename `Print` to `Order printed book` if it starts an order flow.
- The dedication appears before context. Add a small label: `Dedication`.
- Replace `Crafted with:` if no visible value follows, or show the selected style/tool.
- Add `Chapters: 10` and `Estimated reading time` near the synopsis.
- Feedback form needs helper text: `This message is sent to the author.`

## Public Story Chapter - `/en-US/p/[slug]/chapter/[chapterNumber]`

- Reviewed with `/en-US/p/mythoria-a-vision-unfolding/chapter/1`.
- The reading experience works, but mobile controls are numerous and some labels are cramped.
- Simplify toolbar labels:
  - `Cover & Table of Contents` -> `Contents`
  - `Ch. 2 ->` -> `Next chapter`
  - `<- Back` -> `Previous`
- Put chapter navigation at both top and bottom, but keep the bottom version larger for thumb use.
- `Reading Settings` is clear. Consider an icon button with label visible only in the menu.
- Add progress text: `Chapter 1 of 10`.
- Feedback/rating should be visually lower priority than reading navigation.
- Long paragraphs may need a larger default line-height and optional font size control in reading settings.

## Public Story Listen - `/en-US/p/[slug]/listen`

- Reviewed with a story that has no narration.
- `Story Not Found` is inaccurate when the story exists but has no audio.
- Replace with `Audio not available`.
- Supporting copy should say `This story does not have audio narration yet.`
- Change `Go Back` to `Back to story`.
- If the author can generate audio, show `Create audio narration` for owners only.
- For public listeners, offer `Read this story` as the primary fallback.

## Shared Story - `/en-US/s/[token]`

- Reviewed with an invalid sample token.
- Loading copy is clear but should fail quickly if the token is invalid.
- Replace `Failed to access shared story` with `This share link is invalid or expired.`
- Add `Ask the sender for a new link` so the user knows what to do next.
- Keep `Go to Homepage`, but use localized path `/en-US`.
- If loading takes longer than a few seconds, show a retry option and explain what is being checked.

## Shared Story Edit - `/en-US/s/[token]/edit`

- Reviewed with an invalid sample token that redirected to the shared story route.
- Use a distinct error: `You cannot edit this shared story`.
- Explain possible reasons:
  - `The link expired.`
  - `You do not have edit access.`
  - `The story was removed.`
- Primary action should be `Open read-only story` when possible, otherwise `Go home`.
- Secondary action: `Try again`.

## Authenticated Story Detail - `/en-US/stories/[storyId]`

- A sample invalid route rendered only header/footer. Add a visible error state.
- Use `Story not found` with `This story may have been deleted, moved, or you may not have access.`
- Actions: `Back to My Stories` and `Create a new story`.
- For a valid story detail page, use clear action labels: `Read`, `Edit`, `Listen`, `Print`, `Share`.
- If an action is unavailable, explain why: `Audio has not been generated yet.`

## Authenticated Story Read - `/en-US/stories/read/[storyId]`

- Use the same mobile reading simplifications as public story chapters.
- Add `Back to My Stories` somewhere accessible.
- Show `Draft` or `Published` status if it changes available actions.
- If story content is still generating, use `Your story is still being created` with progress instead of a blank page.

## Authenticated Story Chapter - `/en-US/stories/read/[storyId]/chapter/[chapterNumber]`

- Add `Chapter X of Y` and strong bottom navigation.
- Keep editing and generation controls out of the reading path unless explicitly opened.
- If a chapter fails to load, show `We could not load this chapter` plus `Retry` and `Back to story`.

## Authenticated Story Edit - `/en-US/stories/edit/[storyId]`

- Start with a concise summary: `Edit title, story details, characters, and images.`
- Use a mobile tab or accordion layout instead of showing every editor area at once.
- Make destructive actions such as deleting characters/images clearly separated from save actions.
- Use `Save changes` for manual changes and `Ask AI to improve` for AI edits, so users understand the difference.
- Add credit-cost labels directly on AI actions.

## Authenticated Chapter Edit - `/en-US/stories/edit/[storyId]/chapter/[chapterNumber]`

- Label the screen `Edit chapter X`.
- Add autosave or clear save state: `Saved`, `Saving...`, `Could not save`.
- Keep formatting controls compact, preferably icon buttons with tooltips/accessible labels.
- Add a clear preview/read mode toggle.
- AI rewrite actions should explain whether they replace text or suggest changes.

## Authenticated Story Listen - `/en-US/stories/listen/[storyId]`

- If audio exists, make the player the first visible element on mobile.
- If audio does not exist, use `Audio not generated yet` and show `Generate audiobook - 3 credits`.
- Add expected wait time for generation.
- Keep chapter list collapsible below the player.
- Use clear states: `Generating audio`, `Ready to listen`, `Audio failed`.

## Authenticated Story Print - `/en-US/stories/print/[storyId]`

- Start with the decision users need to make: `Choose PDF download or printed delivery`.
- Show costs before forms: `PDF: 4 credits`, `Printed book: 20 credits + shipping`.
- Split mobile flow into steps: `Story`, `Address`, `Payment/credits`, `Review`.
- Make shipping country/price visible before users fill a long address.
- Add reassurance before checkout: `You can review everything before placing the order.`

## Story Print/Edit Dynamic Chapter Routes - `/en-US/stories/edit/[storyId]/chapter/[chapterNumber]`, `/en-US/stories/read/[storyId]/chapter/[chapterNumber]`

- For deep links with missing auth or invalid IDs, never render a blank body.
- Provide route-specific fallback text:
  - `We could not find this chapter.`
  - `This story may still be generating.`
  - `Return to story list.`
- Preserve the requested chapter number in the message when possible.

## Offline - `/offline`

- The page is clear and helpful.
- `Connection restored. Refreshing...` appears in the text even while reviewing online/offline state. Only show it when restoration actually happens.
- Replace `Content you've already opened may still be available` with `Pages you opened before may still work.`
- Button labels are good, but all three should be at least `44px` tall.
- Localize `Home` target consistently to `/en-US` when the user was in English.

## Unsubscribe - `/en-US/unsubscribe`

- The page says `You will no longer receive emails from us at .` with an empty email value. Hide `at {email}` when email is unavailable.
- Simplify copy to `You have been unsubscribed. You will no longer receive marketing emails.`
- Keep the warmer sentence only after the direct confirmation.
- Add `Changed your mind? Contact support` if resubscribe is not self-serve.
- `Return to Mythoria` is clear.

## Not Found - `/en-US/does-not-exist-review`

- The page is friendly and has useful actions.
- Simplify heading to `Page not found` with the playful line below it.
- Current copy is whimsical but long for an error. Use: `The page you requested does not exist or may have moved.`
- Fix action hrefs to include locale:
  - `Return to Homepage` -> `/en-US`
  - `Create a New Story` -> `/en-US/tell-your-story/step-1`
- Avoid external quote references in a task-critical error page; they can distract from recovery.
- Keep `Create a New Story` as secondary action.
