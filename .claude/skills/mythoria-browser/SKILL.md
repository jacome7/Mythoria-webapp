---
name: mythoria-browser
description: >-
  Opens and navigates the Mythoria dev server (http://192.168.1.10:3000) using
  the Playwright MCP browser. Defaults to iPhone 15 mobile view. Accepts
  --desktop (1920×1080) or --tablet (768×1024) to switch viewport. Always
  takes a screenshot after navigating and reports layout, headings, and any
  visible errors.
---

# Mythoria Browser

Drive the Mythoria dev server through the **Playwright MCP** browser tools. This is the canonical way to open, inspect, and interact with the running app in this project.

## Dev Server

| Setting | Value |
|---------|-------|
| Base URL | `http://192.168.1.10:3000` |
| Default locale | `/en-US` (auto-redirected by Next.js) |
| Auth | Sign-in at `/en-US/login` |

## Viewport Modes

| Invocation | Device | Viewport | Notes |
|-----------|--------|----------|-------|
| `/mythoria-browser` or `--mobile` | iPhone 15 | 393 × 852 | Default — always use unless told otherwise |
| `--tablet` | iPad | 768 × 1024 | Mid-size responsive breakpoint |
| `--desktop` | Desktop Chrome | 1920 × 1080 | Full-width layout |

## Step-by-Step Protocol

Follow these steps every time this skill is invoked:

1. **Resize the viewport** to match the requested mode using `browser_resize`:
   - Mobile (default): `width=393, height=852`
   - Tablet: `width=768, height=1024`
   - Desktop: `width=1920, height=1080`

2. **Navigate** to the target URL with `browser_navigate`:
   - Default: `http://192.168.1.10:3000` (will redirect to `/en-US`)
   - If a specific path is given (e.g., `--path /en-US/tell-your-story`), navigate there directly

3. **Take a screenshot** immediately with `browser_screenshot` (enabled via `--caps vision`).

4. **Get the accessibility snapshot** with `browser_snapshot` to extract headings, buttons, and text content.

5. **Report** with:
   - Page title and current URL
   - Main headings (H1, H2)
   - Visible CTAs and navigation
   - Any console errors (use `browser_console_messages` if suspicious)
   - Layout observations relevant to the viewport (e.g., hamburger menu on mobile vs full nav on desktop)

## Common Workflows

### Quick visual check
```
/mythoria-browser
```
Opens homepage in mobile view, takes screenshot, reports layout.

### Desktop full-page review
```
/mythoria-browser --desktop
```
Opens homepage at 1920×1080, takes screenshot.

### Check a specific page in tablet view
```
/mythoria-browser --tablet --path /en-US/tell-your-story
```
Navigates to the story wizard in tablet viewport.

### Test the story reader
```
/mythoria-browser --path /en-US/stories/read/[storyId]
```
Replace `[storyId]` with a real ID from the database or My Stories page.

### Compare all three viewports
Take screenshots in mobile, tablet, and desktop in sequence — resize then screenshot for each — and display all three side by side in your report.

## Key Routes

| Path | Description |
|------|-------------|
| `/en-US` | Homepage |
| `/en-US/tell-your-story` | Story creation wizard (steps 1–5) |
| `/en-US/tell-your-story/step-4` | Character customization step |
| `/en-US/my-stories` | Authenticated user story dashboard |
| `/en-US/stories/read/[id]` | Story reader |
| `/en-US/stories/read/[id]/chapter/[n]` | Specific chapter |
| `/en-US/stories/listen/[id]` | Audio player / listen view |
| `/en-US/pricing` | Pricing page |
| `/en-US/about-us` | About page |
| `/en-US/login` | Sign-in |
| `/en-US/register` | Registration |

## MCP Tools Reference

| Tool | When to use |
|------|------------|
| `browser_resize` | Always first — set viewport to requested mode |
| `browser_navigate` | Go to a URL |
| `browser_screenshot` | Capture current viewport (requires `--caps vision`) |
| `browser_snapshot` | Get accessibility tree — headings, buttons, text |
| `browser_click` | Interact with a UI element |
| `browser_type` | Fill in a text field |
| `browser_console_messages` | Check for JS errors |
| `browser_network_requests` | Inspect API calls |
| `browser_navigate_back` | Go back a page |

## Important Notes

- The MCP server runs **headed Chrome** by default (you can see the browser window open). This is intentional for development — it makes it easy to observe what Claude is doing.
- Viewport resize via `browser_resize` changes the window dimensions but does NOT change the user agent string. For accurate mobile UA testing, restart Claude Code — the MCP can be configured with `--device "iPhone 15"` for a full device emulation session.
- If the dev server is not running, navigate will fail. Start it with `npm run dev` in the project root first.
- The local network IP `192.168.1.10` is allowed explicitly via `--allowed-hosts *` in the MCP config.
