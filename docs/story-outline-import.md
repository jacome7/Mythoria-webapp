# Writing and document outlines

Step 2 opens a nearly full-screen writing editor in every locale. Document import details and writing tips are closed by default. Each opens a native modal panel, keeping the editor size and text intact. Escape closes the active panel first; closing the writer discards any unconfirmed import.

The document panel downloads an editable two-page DOCX in the current locale from `public/downloads/story-outline/`. Each includes the Mythoria wordmark, six optional outline sections and a marked fictional example. Users should replace prompts and delete the example before import. These static downloads require no account or database changes.

Regenerate all five templates with `scripts/generate-story-outlines.py` using the bundled document Python runtime (requires python-docx). Source copy and document styling live in that script. Render each generated file with the documents skill renderer and inspect both pages before publishing updated assets.

Import remains local to the browser and retains its existing size, extraction and complete-brief limits. Only confirmed text enters the story workflow.
