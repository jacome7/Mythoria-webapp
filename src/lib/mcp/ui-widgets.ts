export const MCP_APP_RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

export const WIDGET_SURFACE_RESOURCE_URIS = {
  storyCreation: 'ui://mythoria/story-creation-v1.html',
  storyLibrary: 'ui://mythoria/story-library-v1.html',
  storyReader: 'ui://mythoria/story-reader-v1.html',
} as const;

export type WidgetSurface = keyof typeof WIDGET_SURFACE_RESOURCE_URIS;

export type WidgetTemplateDefinition = {
  surface: WidgetSurface;
  name: string;
  title: string;
  description: string;
  resourceUri: string;
  widgetDescription: string;
  prefersBorder: boolean;
  html: string;
};

function buildWidgetHtml(surface: WidgetSurface): string {
  const appName = 'Mythoria';
  return `<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${appName}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #fffdf8;
        --card: #ffffff;
        --ink: #1f2937;
        --muted: #6b7280;
        --line: #e5d8c5;
        --accent: #0f766e;
        --accent-soft: #ccfbf1;
        --warn: #9a3412;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        background: radial-gradient(circle at top, #fffbeb, var(--bg) 45%);
        color: var(--ink);
        font: 14px/1.45 "Segoe UI", "Trebuchet MS", "Franklin Gothic Medium", sans-serif;
      }
      .shell {
        padding: 12px;
        display: grid;
        gap: 10px;
      }
      .card {
        border: 1px solid var(--line);
        background: var(--card);
        border-radius: 12px;
        padding: 10px;
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .subtitle {
        margin: 2px 0 0;
        color: var(--muted);
        font-size: 12px;
      }
      .status {
        color: var(--muted);
        font-size: 12px;
      }
      .pill {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid #99f6e4;
        background: var(--accent-soft);
        color: #115e59;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
      }
      .stack {
        display: grid;
        gap: 8px;
      }
      .item {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px;
        background: #fffefb;
      }
      .item h3 {
        margin: 0 0 3px;
        font-size: 14px;
      }
      .item p {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
      }
      .actions {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .btn {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #111827;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .btn:hover {
        border-color: #94a3b8;
      }
      .btn.primary {
        border-color: #0f766e;
        background: #115e59;
        color: white;
      }
      .btn.warn {
        border-color: #fed7aa;
        background: #fff7ed;
        color: var(--warn);
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .kv {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 4px 8px;
        font-size: 12px;
      }
      .kv .k {
        color: var(--muted);
      }
      .text-block {
        max-height: 220px;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px;
        white-space: pre-wrap;
        background: #fffefb;
      }
      .empty {
        color: var(--muted);
        font-size: 12px;
      }
      .error {
        color: #b91c1c;
      }
      .mono {
        font-family: Consolas, "Courier New", monospace;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card head">
        <div>
          <h1 class="title" id="surface-title"></h1>
          <p class="subtitle" id="surface-subtitle"></p>
        </div>
        <div class="actions">
          <button class="btn" data-action="fullscreen">Fullscreen</button>
          <button class="btn" data-action="ask-chat">Continue in Chat</button>
          <button class="btn" data-action="close">Close</button>
        </div>
      </section>
      <section class="card">
        <p id="status-line" class="status">Waiting for tool result...</p>
        <div id="root" class="stack"></div>
      </section>
    </main>

    <script>
      (function () {
        'use strict';

        const SURFACE = ${JSON.stringify(surface)};
        const bridge = window.openai || null;
        const state = {
          nextRequestId: 1,
          pending: new Map(),
          toolInput: bridge && bridge.toolInput ? bridge.toolInput : null,
          toolResult: bridge && bridge.toolOutput ? { structuredContent: bridge.toolOutput, _meta: bridge.toolResponseMetadata || null } : null,
          status: 'ready',
          error: null
        };

        const I18N = {
          'en-US': {
            creationTitle: 'Story Creation',
            creationSubtitle: 'Draft setup and generation checkpoints',
            libraryTitle: 'Story Library',
            librarySubtitle: 'Visual picker for stories and next actions',
            readerTitle: 'Read and Listen',
            readerSubtitle: 'Chapter and audiobook navigation',
            noData: 'No structured payload yet.',
            draftReady: 'Draft is ready to generate.',
            draftMissing: 'Draft still has required fields missing.',
            listEmpty: 'No stories in this payload.',
            chapterUnavailable: 'No chapter is currently loaded.',
            audiobookEmpty: 'No audiobook entries are available.',
            running: 'Running tool call...',
            ready: 'Ready.',
            failed: 'Tool call failed.'
          }
        };

        const elRoot = document.getElementById('root');
        const elStatus = document.getElementById('status-line');
        const elTitle = document.getElementById('surface-title');
        const elSubtitle = document.getElementById('surface-subtitle');

        function isRecord(value) {
          return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
        }

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function asArray(value) {
          return Array.isArray(value) ? value : [];
        }

        function resolveLocale(data) {
          if (isRecord(data) && typeof data.locale === 'string') return data.locale;
          if (document && document.documentElement && document.documentElement.lang) {
            return document.documentElement.lang;
          }
          return 'en-US';
        }

        function t(key, data) {
          const locale = resolveLocale(data);
          const bundle = I18N[locale] || I18N['en-US'];
          return bundle[key] || key;
        }

        function updateHeader(data) {
          if (SURFACE === 'storyCreation') {
            elTitle.textContent = t('creationTitle', data);
            elSubtitle.textContent = t('creationSubtitle', data);
            return;
          }
          if (SURFACE === 'storyLibrary') {
            elTitle.textContent = t('libraryTitle', data);
            elSubtitle.textContent = t('librarySubtitle', data);
            return;
          }
          elTitle.textContent = t('readerTitle', data);
          elSubtitle.textContent = t('readerSubtitle', data);
        }

        function setStatus(text, isError) {
          state.error = isError ? text : null;
          elStatus.textContent = text;
          elStatus.className = isError ? 'status error' : 'status';
        }

        function rpcRequest(method, params) {
          return new Promise(function (resolve, reject) {
            const id = state.nextRequestId++;
            state.pending.set(id, { resolve: resolve, reject: reject });
            window.parent.postMessage(
              {
                jsonrpc: '2.0',
                id: id,
                method: method,
                params: params || {}
              },
              '*'
            );
          });
        }

        async function callTool(name, args) {
          setStatus(t('running', getData()), false);
          try {
            const result = await rpcRequest('tools/call', {
              name: name,
              arguments: args || {}
            });
            if (isRecord(result)) {
              state.toolResult = result;
            }
            render();
            setStatus(t('ready', getData()), false);
          } catch (error) {
            const message = error && error.message ? error.message : t('failed', getData());
            setStatus(message, true);
          }
        }

        async function sendFollowUp(prompt) {
          try {
            await rpcRequest('ui/message', {
              role: 'user',
              content: [{ type: 'text', text: prompt }]
            });
          } catch (_err) {
            setStatus('Unable to send follow-up message.', true);
          }
        }

        async function updateModelContext(text) {
          try {
            await rpcRequest('ui/update-model-context', {
              content: [{ type: 'text', text: text }]
            });
          } catch (_err) {
            // Ignore context update failures.
          }
        }

        function getData() {
          if (state.toolResult && isRecord(state.toolResult.structuredContent)) {
            return state.toolResult.structuredContent;
          }
          if (bridge && isRecord(bridge.toolOutput)) {
            return bridge.toolOutput;
          }
          return {};
        }

        function renderCreation(data) {
          const story = isRecord(data.story) ? data.story : null;
          const storyId = story && typeof story.id === 'string' ? story.id : '';
          const missingFields = story && Array.isArray(story.missingRequiredFields)
            ? story.missingRequiredFields.map(function (item) { return escapeHtml(item); })
            : [];
          const isReady = Boolean(story && story.readyToGenerate);

          const rows = [];
          if (story) {
            rows.push('<div class="item"><div class="kv">');
            rows.push('<div class="k">Story ID</div><div class="mono">' + escapeHtml(story.id || '') + '</div>');
            rows.push('<div class="k">Title</div><div>' + escapeHtml(story.title || '-') + '</div>');
            rows.push('<div class="k">Status</div><div><span class="pill">' + escapeHtml(story.status || 'draft') + '</span></div>');
            rows.push('<div class="k">Language</div><div>' + escapeHtml(story.storyLanguage || story.language || '-') + '</div>');
            rows.push('</div></div>');
          }

          rows.push('<div class="item">');
          rows.push('<p>' + escapeHtml(isReady ? t('draftReady', data) : t('draftMissing', data)) + '</p>');
          if (missingFields.length > 0) {
            rows.push('<p class="mono">Missing: ' + missingFields.join(', ') + '</p>');
          }
          rows.push('<div class="actions">');
          rows.push('<button class="btn" data-action="refresh-draft" data-story-id="' + escapeHtml(storyId) + '"' + (storyId ? '' : ' disabled') + '>Refresh Draft</button>');
          rows.push('<button class="btn primary" data-action="dry-run-generate" data-story-id="' + escapeHtml(storyId) + '"' + (storyId ? '' : ' disabled') + '>Check Generation</button>');
          rows.push('</div></div>');
          return rows.join('');
        }

        function renderLibrary(data) {
          const stories = asArray(data.stories).length > 0 ? asArray(data.stories) : asArray(data.candidates);
          if (stories.length === 0) {
            return '<p class="empty">' + escapeHtml(t('listEmpty', data)) + '</p>';
          }

          const html = [];
          stories.forEach(function (story) {
            if (!isRecord(story)) return;
            const storyId = typeof story.id === 'string' ? story.id : '';
            const title = typeof story.title === 'string' ? story.title : 'Untitled Story';
            const status = typeof story.status === 'string' ? story.status : 'unknown';
            const hasAudio = Boolean(story.hasAudio);
            html.push('<article class="item">');
            html.push('<h3>' + escapeHtml(title) + '</h3>');
            html.push('<p>Status: <span class="pill">' + escapeHtml(status) + '</span></p>');
            html.push('<div class="actions">');
            html.push('<button class="btn primary" data-action="select-story" data-story-id="' + escapeHtml(storyId) + '"' + (storyId ? '' : ' disabled') + '>Select</button>');
            html.push('<button class="btn" data-action="read-story" data-story-id="' + escapeHtml(storyId) + '"' + (storyId ? '' : ' disabled') + '>Read</button>');
            html.push('<button class="btn" data-action="audio-status" data-story-id="' + escapeHtml(storyId) + '"' + (storyId ? '' : ' disabled') + (hasAudio ? '' : '') + '>Audio</button>');
            html.push('</div>');
            html.push('</article>');
          });
          return html.join('');
        }

        function renderReader(data) {
          const story = isRecord(data.story) ? data.story : null;
          const storyId = story && typeof story.id === 'string' ? story.id : '';
          const chapter = isRecord(data.chapter) ? data.chapter : null;
          const navigation = isRecord(data.navigation) ? data.navigation : null;
          const chapters = isRecord(data.chapters) && Array.isArray(data.chapters.items) ? data.chapters.items : [];
          const audiobook = isRecord(data.audiobook) ? data.audiobook : null;
          const entries = audiobook && Array.isArray(audiobook.entries) ? audiobook.entries : [];

          const html = [];
          if (chapter) {
            const chapterNumber = Number(chapter.chapterNumber || 0);
            const previewText = typeof chapter.text === 'string'
              ? chapter.text
              : typeof chapter.summary === 'string'
                ? chapter.summary
                : '';
            html.push('<article class="item">');
            html.push('<h3>Chapter ' + escapeHtml(chapterNumber || '?') + ': ' + escapeHtml(chapter.title || 'Untitled') + '</h3>');
            html.push('<div class="text-block">' + escapeHtml(previewText || t('chapterUnavailable', data)) + '</div>');
            html.push('<div class="actions">');
            html.push('<button class="btn" data-action="navigate" data-story-id="' + escapeHtml(storyId) + '" data-direction="previous" data-chapter="' + escapeHtml(chapterNumber) + '"' + (storyId ? '' : ' disabled') + '>Previous</button>');
            html.push('<button class="btn primary" data-action="navigate" data-story-id="' + escapeHtml(storyId) + '" data-direction="next" data-chapter="' + escapeHtml(chapterNumber) + '"' + (storyId ? '' : ' disabled') + '>Next</button>');
            html.push('</div></article>');
          } else if (chapters.length > 0) {
            html.push('<article class="item"><h3>Chapters</h3><div class="actions">');
            chapters.slice(0, 20).forEach(function (entry) {
              if (!isRecord(entry)) return;
              const chapterNumber = Number(entry.chapterNumber || 0);
              html.push('<button class="btn" data-action="read-chapter" data-story-id="' + escapeHtml(storyId) + '" data-chapter="' + escapeHtml(chapterNumber) + '"' + (storyId ? '' : ' disabled') + '>Chapter ' + escapeHtml(chapterNumber || '?') + '</button>');
            });
            html.push('</div></article>');
          } else {
            html.push('<p class="empty">' + escapeHtml(t('chapterUnavailable', data)) + '</p>');
          }

          if (entries.length > 0) {
            html.push('<article class="item"><h3>Audiobook</h3><div class="actions">');
            entries.slice(0, 20).forEach(function (entry) {
              if (!isRecord(entry)) return;
              const chapterNumber = Number(entry.chapterNumber || 0);
              html.push('<button class="btn warn" data-action="audio-chapter" data-story-id="' + escapeHtml(storyId) + '" data-chapter="' + escapeHtml(chapterNumber) + '"' + (storyId ? '' : ' disabled') + '>Play Ch ' + escapeHtml(chapterNumber || '?') + '</button>');
            });
            html.push('</div></article>');
          } else if (isRecord(data.audiobook)) {
            html.push('<p class="empty">' + escapeHtml(t('audiobookEmpty', data)) + '</p>');
          }

          if (navigation && navigation.nextChapterNumber !== undefined) {
            html.push('<p class="status">Next chapter: ' + escapeHtml(navigation.nextChapterNumber) + '</p>');
          }

          return html.join('');
        }

        function render() {
          const data = getData();
          updateHeader(data);
          if (!isRecord(data) || Object.keys(data).length === 0) {
            elRoot.innerHTML = '<p class="empty">' + escapeHtml(t('noData', data)) + '</p>';
            return;
          }

          if (SURFACE === 'storyCreation') {
            elRoot.innerHTML = renderCreation(data);
          } else if (SURFACE === 'storyLibrary') {
            elRoot.innerHTML = renderLibrary(data);
          } else {
            elRoot.innerHTML = renderReader(data);
          }

          if (bridge && typeof bridge.notifyIntrinsicHeight === 'function') {
            bridge.notifyIntrinsicHeight();
          }
        }

        async function handleAction(button) {
          const action = button.getAttribute('data-action');
          const data = getData();
          const locale = resolveLocale(data);
          const storyId = button.getAttribute('data-story-id') || '';
          const chapterNumber = Number(button.getAttribute('data-chapter') || 0);
          const direction = button.getAttribute('data-direction') || 'next';

          if (action === 'fullscreen') {
            if (bridge && typeof bridge.requestDisplayMode === 'function') {
              try {
                await bridge.requestDisplayMode({ mode: 'fullscreen' });
              } catch (_err) {
                setStatus('Fullscreen request was rejected.', true);
              }
            }
            return;
          }

          if (action === 'close') {
            if (bridge && typeof bridge.requestClose === 'function') {
              bridge.requestClose();
            }
            return;
          }

          if (action === 'ask-chat') {
            await sendFollowUp('Please continue helping me with this story in chat.');
            return;
          }

          if (action === 'refresh-draft' && storyId) {
            await callTool('mythoria.story.update_draft', { storyId: storyId, locale: locale });
            return;
          }

          if (action === 'dry-run-generate' && storyId) {
            await callTool('mythoria.story.start_generation', {
              storyId: storyId,
              dryRun: true,
              confirmStart: false,
              locale: locale
            });
            return;
          }

          if (action === 'select-story' && storyId) {
            await callTool('mythoria.account.story_select', { storyId: storyId, locale: locale });
            await updateModelContext('User selected story ' + storyId + '.');
            return;
          }

          if (action === 'read-story' && storyId) {
            await callTool('mythoria.story.read_overview', { storyId: storyId, locale: locale });
            return;
          }

          if (action === 'audio-status' && storyId) {
            await callTool('mythoria.story.audio_status', { storyId: storyId, locale: locale });
            return;
          }

          if (action === 'read-chapter' && storyId && chapterNumber > 0) {
            await callTool('mythoria.story.read_chapter', {
              storyId: storyId,
              chapterNumber: chapterNumber,
              mode: 'full',
              locale: locale
            });
            return;
          }

          if (action === 'navigate' && storyId && chapterNumber > 0) {
            await callTool('mythoria.story.read_next_chapter', {
              storyId: storyId,
              currentChapterNumber: chapterNumber,
              direction: direction,
              mode: 'full',
              locale: locale
            });
            return;
          }

          if (action === 'audio-chapter' && storyId && chapterNumber > 0) {
            await callTool('mythoria.story.audio_chapter', {
              storyId: storyId,
              chapterNumber: chapterNumber,
              locale: locale
            });
          }
        }

        document.addEventListener('click', function (event) {
          const target = event.target;
          if (!target || typeof target.closest !== 'function') return;
          const button = target.closest('[data-action]');
          if (!button) return;
          event.preventDefault();
          handleAction(button);
        });

        window.addEventListener(
          'message',
          function (event) {
            if (event.source !== window.parent) return;
            const message = event.data;
            if (!isRecord(message) || message.jsonrpc !== '2.0') return;

            if (message.id !== undefined && state.pending.has(message.id)) {
              const pending = state.pending.get(message.id);
              state.pending.delete(message.id);
              if (isRecord(message.error)) {
                pending.reject(new Error(String(message.error.message || 'RPC request failed')));
              } else {
                pending.resolve(message.result);
              }
              return;
            }

            if (message.method === 'ui/notifications/tool-input') {
              state.toolInput = isRecord(message.params) ? message.params : null;
              render();
              return;
            }

            if (message.method === 'ui/notifications/tool-result') {
              state.toolResult = isRecord(message.params) ? message.params : null;
              render();
            }
          },
          { passive: true }
        );

        render();
      })();
    </script>
  </body>
</html>`;
}

export const WIDGET_TEMPLATES: readonly WidgetTemplateDefinition[] = [
  {
    surface: 'storyCreation',
    name: 'mythoria.story-creation-widget',
    title: 'Mythoria Story Creation Widget',
    description: 'Interactive creation assistant for story draft readiness and generation.',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    widgetDescription:
      'Interactive story creation controls for draft updates, readiness checks, and generation prep.',
    prefersBorder: true,
    html: buildWidgetHtml('storyCreation'),
  },
  {
    surface: 'storyLibrary',
    name: 'mythoria.story-library-widget',
    title: 'Mythoria Story Library Widget',
    description: 'Interactive story list and selection surface.',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    widgetDescription:
      'Interactive story list with selection, read, and audio status actions for quick navigation.',
    prefersBorder: true,
    html: buildWidgetHtml('storyLibrary'),
  },
  {
    surface: 'storyReader',
    name: 'mythoria.story-reader-widget',
    title: 'Mythoria Story Reader Widget',
    description: 'Interactive chapter and audiobook navigation surface.',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    widgetDescription:
      'Interactive chapter and audiobook navigator with next/previous controls and playback actions.',
    prefersBorder: true,
    html: buildWidgetHtml('storyReader'),
  },
];
