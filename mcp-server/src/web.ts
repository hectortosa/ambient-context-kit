/**
 * Web UI for browsing vault notes
 * Serves a minimal, monospace-inspired markdown reader
 */

import {
  findMarkdownFiles,
  readVaultFile,
  searchVault,
} from "./utils/vault.js";
import { basename } from "path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SECTIONS = ["Inbox", "Tasks", "Memory", "Research", "Writing"] as const;

/**
 * Handle web UI and API requests
 * Returns null if the path doesn't match any web route
 */
export async function handleWebRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Serve the main UI
  if (path === "/" && req.method === "GET") {
    return new Response(getHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // API: list sections
  if (path === "/api/sections" && req.method === "GET") {
    return json(SECTIONS);
  }

  // API: list files in a section
  if (path.startsWith("/api/files/") && req.method === "GET") {
    const section = decodeURIComponent(path.replace("/api/files/", ""));
    if (!SECTIONS.includes(section as typeof SECTIONS[number])) {
      return json({ error: "Invalid section" }, 400);
    }
    try {
      const files = await findMarkdownFiles(section, { excludeArchive: true });
      const items = await Promise.all(
        files.map(async (f) => {
          // Extract folder relative to section (e.g. "Tasks/My Project/foo.md" -> "My Project")
          const relToSection = f.slice(section.length + 1); // remove "Tasks/"
          const parts = relToSection.split("/");
          const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
          try {
            const file = await readVaultFile(f);
            return {
              path: f,
              name: file.name,
              folder,
              tags: file.frontmatter.tags || [],
              dueDate: file.frontmatter.dueDate || null,
              excerpt: file.body.trim().slice(0, 200),
            };
          } catch {
            return {
              path: f,
              name: basename(f, ".md"),
              folder,
              tags: [],
              dueDate: null,
              excerpt: "",
            };
          }
        })
      );
      // Sort: folders first (alphabetical), then root files (by dueDate then name)
      items.sort((a, b) => {
        const fa = a.folder || "";
        const fb = b.folder || "";
        // Folders before root files
        if (fa && !fb) return -1;
        if (!fa && fb) return 1;
        // Within same group, sort by folder name
        if (fa !== fb) return fa.localeCompare(fb);
        // Within same folder/root, sort by dueDate then name
        if (a.dueDate && b.dueDate) return String(a.dueDate).localeCompare(String(b.dueDate));
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.name.localeCompare(b.name);
      });
      return json(items);
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // API: read a specific note
  if (path.startsWith("/api/note/") && req.method === "GET") {
    const notePath = decodeURIComponent(path.replace("/api/note/", ""));
    try {
      const file = await readVaultFile(notePath);
      return json({
        path: file.relativePath,
        name: file.name,
        frontmatter: file.frontmatter,
        body: file.body,
        raw: file.content,
      });
    } catch (e) {
      return json({ error: `Not found: ${notePath}` }, 404);
    }
  }

  // API: resolve a wiki-link name to a file path
  if (path === "/api/resolve" && req.method === "GET") {
    const name = url.searchParams.get("name") || "";
    if (!name) return json({ error: "Missing name" }, 400);
    try {
      // Search all sections for a file matching this name
      const dirs = ["Memory", "Tasks", "Research", "Writing", "Inbox"];
      for (const dir of dirs) {
        const files = await findMarkdownFiles(dir, { excludeArchive: false });
        for (const f of files) {
          const fileName = basename(f, ".md");
          if (fileName.toLowerCase() === name.toLowerCase()) {
            return json({ path: f });
          }
        }
      }
      return json({ path: null });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // API: search
  if (path === "/api/search" && req.method === "GET") {
    const query = url.searchParams.get("q") || "";
    const mode = (url.searchParams.get("mode") || "keyword") as "hybrid" | "keyword" | "semantic";
    if (!query) return json([]);
    try {
      const results = await searchVault(query, { limit: 20, mode });
      return json(
        results.map((r) => ({
          path: r.relativePath,
          name: r.name,
          tags: r.frontmatter.tags || [],
          excerpt: r.body.trim().slice(0, 200),
        }))
      );
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  return null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vault</title>
<style>
  :root {
    --bg: #fafaf8;
    --bg-sidebar: #f2f1ed;
    --bg-hover: #eae9e4;
    --bg-active: #dddcd7;
    --fg: #1a1a1a;
    --fg-dim: #6b6b6b;
    --fg-dimmer: #999;
    --border: #d4d3ce;
    --accent: #4a4a4a;
    --tag-bg: #e8e7e2;
    --tag-fg: #555;
    --link: #2a5a8a;
    --code-bg: #eeedea;
    --font: "Berkeley Mono", "IBM Plex Mono", "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", ui-monospace, monospace;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a1a;
      --bg-sidebar: #222;
      --bg-hover: #2a2a2a;
      --bg-active: #333;
      --fg: #d4d4d4;
      --fg-dim: #888;
      --fg-dimmer: #666;
      --border: #333;
      --accent: #bbb;
      --tag-bg: #2a2a2a;
      --tag-fg: #aaa;
      --link: #6ba3d6;
      --code-bg: #252525;
    }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font);
    font-size: 14px;
    line-height: 1.6;
    color: var(--fg);
    background: var(--bg);
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .layout {
    display: grid;
    grid-template-columns: 200px 280px 1fr;
    flex: 1;
    min-height: 0;
  }

  /* Sidebar - sections */
  .sidebar {
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    padding: 16px 0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-title {
    padding: 0 16px 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-dim);
  }

  .section-item {
    padding: 8px 16px;
    cursor: pointer;
    color: var(--fg);
    font-size: 13px;
    border-left: 3px solid transparent;
    transition: background 0.1s;
  }

  .section-item:hover { background: var(--bg-hover); }
  .section-item.active {
    background: var(--bg-active);
    border-left-color: var(--accent);
    font-weight: 600;
  }

  .section-count {
    float: right;
    color: var(--fg-dimmer);
    font-size: 11px;
  }

  .sidebar-search {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-search input {
    width: 100%;
    padding: 6px 10px;
    font-family: var(--font);
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    outline: none;
  }

  .sidebar-search input:focus {
    border-color: var(--accent);
  }

  .sidebar-search input::placeholder {
    color: var(--fg-dimmer);
  }

  .sidebar-search select {
    width: 100%;
    padding: 4px 8px;
    margin-top: 6px;
    font-family: var(--font);
    font-size: 11px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg-dim);
    outline: none;
    cursor: pointer;
  }

  .sidebar-search select:focus {
    border-color: var(--accent);
  }

  /* File list */
  .file-list {
    border-right: 1px solid var(--border);
    overflow-y: auto;
    background: var(--bg);
  }

  .file-list-header {
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-dim);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
  }

  .file-item {
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }

  .file-item:hover { background: var(--bg-hover); }
  .file-item.active { background: var(--bg-active); }

  .file-name {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 2px;
    word-break: break-word;
  }

  .file-meta {
    font-size: 11px;
    color: var(--fg-dim);
  }

  .file-excerpt {
    font-size: 11px;
    color: var(--fg-dimmer);
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-header {
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--fg-dim);
    background: var(--bg-sidebar);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .folder-header:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .folder-arrow {
    font-size: 10px;
    transition: transform 0.15s;
    display: inline-block;
  }

  .folder-header.collapsed .folder-arrow {
    transform: rotate(-90deg);
  }

  .folder-header .folder-count {
    margin-left: auto;
    font-size: 11px;
    font-weight: 400;
    color: var(--fg-dimmer);
  }

  .folder-contents.hidden {
    display: none;
  }

  .tag {
    display: inline-block;
    font-size: 10px;
    padding: 1px 6px;
    margin-right: 4px;
    border-radius: 3px;
    background: var(--tag-bg);
    color: var(--tag-fg);
  }

  /* Content area */
  .content {
    overflow-y: auto;
    padding: 32px 48px;
    max-width: 100%;
  }

  .content-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--fg-dimmer);
    font-size: 13px;
  }

  .note-path {
    font-size: 11px;
    color: var(--fg-dimmer);
    margin-bottom: 8px;
  }

  .note-frontmatter {
    font-size: 12px;
    color: var(--fg-dim);
    padding: 12px 16px;
    background: var(--code-bg);
    border-radius: 4px;
    margin-bottom: 24px;
    white-space: pre;
    overflow-x: auto;
  }

  .note-body {
    font-size: 14px;
    line-height: 1.7;
    max-width: 720px;
  }

  /* Markdown rendering */
  .note-body h1 { font-size: 22px; margin: 24px 0 12px; font-weight: 600; }
  .note-body h2 { font-size: 18px; margin: 20px 0 10px; font-weight: 600; }
  .note-body h3 { font-size: 15px; margin: 16px 0 8px; font-weight: 600; }
  .note-body p { margin: 8px 0; }
  .note-body ul, .note-body ol { padding-left: 24px; margin: 8px 0; }
  .note-body li { margin: 4px 0; }
  .note-body code {
    font-family: var(--font);
    font-size: 13px;
    background: var(--code-bg);
    padding: 2px 6px;
    border-radius: 3px;
  }
  .note-body pre {
    background: var(--code-bg);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 12px 0;
  }
  .note-body pre code {
    background: none;
    padding: 0;
  }
  .note-body blockquote {
    border-left: 3px solid var(--border);
    padding-left: 16px;
    color: var(--fg-dim);
    margin: 12px 0;
  }
  .note-body a { color: var(--link); text-decoration: none; }
  .note-body a:hover { text-decoration: underline; }
  .note-body hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 20px 0;
  }
  .note-body img { max-width: 100%; }

  .wiki-link {
    color: var(--link);
    cursor: pointer;
    text-decoration: none;
    border-bottom: 1px dashed var(--link);
  }
  .wiki-link:hover { border-bottom-style: solid; }

  /* Scheduler view */
  .scheduler-view { max-width: 640px; }
  .scheduler-view h2 { font-size: 18px; margin-bottom: 16px; font-weight: 600; }
  .scheduler-view h3 { font-size: 14px; margin: 20px 0 8px; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: 0.05em; }

  .scheduler-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
  }
  .scheduler-status.on { background: #d4edda; color: #155724; }
  .scheduler-status.off { background: var(--tag-bg); color: var(--fg-dim); }
  @media (prefers-color-scheme: dark) {
    .scheduler-status.on { background: #1a3a2a; color: #75d89a; }
  }

  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 8px 0;
  }
  .schedule-table th {
    text-align: left;
    padding: 6px 12px;
    border-bottom: 2px solid var(--border);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-dim);
  }
  .schedule-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  .schedule-table tr:last-child td { border-bottom: none; }

  .schedule-enabled { color: #28a745; }
  .schedule-disabled { color: var(--fg-dimmer); }
  @media (prefers-color-scheme: dark) {
    .schedule-enabled { color: #75d89a; }
  }

  .scheduler-btn {
    font-family: var(--font);
    font-size: 12px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    cursor: pointer;
    margin-right: 6px;
  }
  .scheduler-btn:hover { background: var(--bg-hover); }
  .scheduler-btn.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .scheduler-btn.primary:hover { opacity: 0.9; }

  .scheduler-running {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    background: #fff3cd;
    color: #856404;
    margin-top: 8px;
  }
  @media (prefers-color-scheme: dark) {
    .scheduler-running { background: #3a3020; color: #e8c86a; }
  }

  .task-checkbox {
    margin-right: 4px;
    pointer-events: none;
  }

  /* Loading */
  .loading {
    color: var(--fg-dimmer);
    padding: 16px;
    font-size: 12px;
  }

  /* Mobile nav bar */
  .mobile-nav {
    display: none;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--bg-sidebar);
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 20;
  }

  .mobile-nav button {
    font-family: var(--font);
    font-size: 13px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--fg);
    cursor: pointer;
  }

  .mobile-nav button.active {
    background: var(--bg-active);
    font-weight: 600;
  }

  .mobile-nav .mobile-title {
    font-size: 12px;
    color: var(--fg-dim);
    margin-left: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .mobile-nav {
      display: flex;
    }

    .layout {
      grid-template-columns: 1fr;
    }

    .sidebar, .file-list {
      display: none;
    }

    .sidebar.mobile-show, .file-list.mobile-show {
      display: block;
      position: fixed;
      top: 45px;
      left: 0;
      width: 100%;
      height: calc(100vh - 45px);
      z-index: 10;
      overflow-y: auto;
    }

    .content {
      padding: 16px;
    }

    .mobile-close {
      display: block;
      padding: 12px 16px;
      font-family: var(--font);
      font-size: 12px;
      color: var(--fg-dim);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      text-align: right;
    }

    .mobile-close:hover {
      color: var(--fg);
    }
  }
</style>
</head>
<body>

<div class="mobile-nav" id="mobile-nav">
  <button id="mobile-sections-btn">Sections</button>
  <button id="mobile-files-btn">Files</button>
  <span class="mobile-title" id="mobile-title">Vault</span>
</div>

<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-search">
      <input type="text" id="search" placeholder="Search..." />
      <select id="search-mode">
        <option value="keyword">Keyword (BM25)</option>
        <option value="hybrid">Hybrid</option>
        <option value="semantic">Semantic</option>
      </select>
    </div>
    <div class="sidebar-title">Sections</div>
    <div id="sections"></div>
  </nav>

  <div class="file-list" id="file-list">
    <div class="file-list-header" id="file-list-header">Select a section</div>
    <div id="files"></div>
  </div>

  <main class="content" id="content">
    <div class="content-empty">Select a note to view</div>
  </main>
</div>

<script>
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let activeSection = null;
let activeFile = null;

function closeMobilePanels() {
  document.querySelector('.sidebar').classList.remove('mobile-show');
  document.querySelector('.file-list').classList.remove('mobile-show');
  $$('#mobile-nav button').forEach(b => b.classList.remove('active'));
}

// Minimal markdown to HTML
function md(text) {
  let html = text;
  const BT = String.fromCharCode(96);

  // Code blocks (fenced)
  const codeBlockRe = new RegExp(BT + BT + BT + '(\\\\w*)\\\\n([\\\\s\\\\S]*?)' + BT + BT + BT, 'g');
  html = html.replace(codeBlockRe, (_, lang, code) =>
    '<pre><code>' + esc(code.trim()) + '</code></pre>');

  // Inline code
  const inlineCodeRe = new RegExp(BT + '([^' + BT + ']+)' + BT, 'g');
  html = html.replace(inlineCodeRe, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

  // Wiki links - make them clickable
  html = html.replace(/\\[\\[([^\\]]+)\\]\\]/g, '<span class="wiki-link" data-link="$1">$1</span>');

  // Regular links
  html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');

  // Task checkboxes
  html = html.replace(/^(\\s*)- \\[x\\] /gm, '$1<input type="checkbox" checked class="task-checkbox">');
  html = html.replace(/^(\\s*)- \\[ \\] /gm, '$1<input type="checkbox" class="task-checkbox">');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^(\\s*)- (.+)$/gm, '$1<li>$2</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\\/li>\\n?)+/g, (match) => '<ul>' + match + '</ul>');

  // Paragraphs - wrap remaining bare lines
  html = html.split('\\n\\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<')) return block;
    return '<p>' + block.replace(/\\n/g, '<br>') + '</p>';
  }).join('\\n');

  return html;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Format frontmatter as YAML-like display
function fmDisplay(fm) {
  if (!fm || Object.keys(fm).length === 0) return '';
  let out = '---\\n';
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      out += k + ':\\n';
      v.forEach(i => out += '  - ' + i + '\\n');
    } else {
      out += k + ': ' + v + '\\n';
    }
  }
  out += '---';
  return out;
}

async function loadSections() {
  const res = await fetch('/api/sections');
  const sections = await res.json();
  const container = $('#sections');
  container.innerHTML = '';
  for (const s of sections) {
    const el = document.createElement('div');
    el.className = 'section-item';
    el.textContent = s;
    el.dataset.section = s;
    el.onclick = () => selectSection(s);
    container.appendChild(el);
  }

  // Add Scheduler as a special section
  const divider = document.createElement('div');
  divider.style.cssText = 'border-top: 1px solid var(--border); margin: 12px 16px 4px;';
  container.appendChild(divider);

  const schedEl = document.createElement('div');
  schedEl.className = 'section-item';
  schedEl.textContent = 'Scheduler';
  schedEl.dataset.section = 'Scheduler';
  schedEl.onclick = () => showScheduler();
  container.appendChild(schedEl);
}

async function showScheduler() {
  activeSection = 'Scheduler';
  activeFile = null;
  $$('.section-item').forEach(el => el.classList.toggle('active', el.dataset.section === 'Scheduler'));
  $('#file-list-header').textContent = 'Scheduler';
  $('#files').innerHTML = '<div class="loading" style="color:var(--fg-dim);font-size:12px;padding:16px;">Workflow automation schedules</div>';

  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading scheduler...</div>';

  try {
    const res = await fetch('/api/scheduler');
    const data = await res.json();
    renderScheduler(data);
  } catch (e) {
    content.innerHTML = '<div class="content-empty">Could not load scheduler status</div>';
  }

  if (window.innerWidth <= 768) {
    closeMobilePanels();
    $('#mobile-title').textContent = 'Scheduler';
  }
}

function renderScheduler(data) {
  const content = $('#content');
  const statusClass = data.enabled ? 'on' : 'off';
  const statusLabel = data.enabled ? 'Enabled' : 'Disabled';

  let html = '<div class="scheduler-view">';
  html += '<h2>Workflow Scheduler</h2>';
  html += '<p style="margin-bottom:16px;color:var(--fg-dim);font-size:13px;">Automatically runs vault workflows at scheduled times (configured timezone).</p>';

  html += '<div style="margin-bottom:20px;">';
  html += '<span class="scheduler-status ' + statusClass + '">' + statusLabel + '</span> ';
  html += '<button class="scheduler-btn" id="sched-toggle">' + (data.enabled ? 'Disable' : 'Enable') + '</button>';
  html += '</div>';

  if (data.running) {
    html += '<div class="scheduler-running">Running: <strong>' + esc(data.running) + '</strong></div>';
  }

  html += '<h3>Schedules</h3>';
  html += '<table class="schedule-table">';
  html += '<thead><tr><th>Workflow</th><th>Time</th><th>Days</th><th>Status</th><th></th></tr></thead>';
  html += '<tbody>';
  for (const s of data.schedules) {
    const cls = s.enabled ? 'schedule-enabled' : 'schedule-disabled';
    html += '<tr>';
    html += '<td><strong>' + esc(s.workflow) + '</strong></td>';
    html += '<td>' + esc(s.time) + '</td>';
    html += '<td style="font-size:12px;color:var(--fg-dim)">' + esc(s.days) + '</td>';
    html += '<td class="' + cls + '">' + (s.enabled ? 'On' : 'Off') + '</td>';
    html += '<td><button class="scheduler-btn sched-trigger" data-workflow="' + esc(s.workflow) + '">Run now</button></td>';
    html += '</tr>';
  }
  html += '</tbody></table>';

  // Last runs
  const runs = Object.entries(data.lastRuns || {});
  if (runs.length > 0) {
    html += '<h3>Recent Runs</h3>';
    html += '<table class="schedule-table">';
    html += '<thead><tr><th>Key</th><th>Timestamp</th></tr></thead><tbody>';
    for (const [key, ts] of runs) {
      const d = new Date(ts);
      const fmt = d.toLocaleString();
      html += '<tr><td style="font-size:12px">' + esc(key) + '</td><td style="font-size:12px;color:var(--fg-dim)">' + esc(fmt) + '</td></tr>';
    }
    html += '</tbody></table>';
  }

  html += '</div>';
  content.innerHTML = html;

  // Wire up toggle button
  $('#sched-toggle').addEventListener('click', async () => {
    const action = data.enabled ? 'disable' : 'enable';
    await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    showScheduler();
  });

  // Wire up trigger buttons
  content.querySelectorAll('.sched-trigger').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const workflow = e.target.dataset.workflow;
      btn.disabled = true;
      btn.textContent = 'Starting...';
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', workflow })
      });
      const result = await res.json();
      if (result.success) {
        btn.textContent = 'Started';
        setTimeout(() => showScheduler(), 3000);
      } else {
        btn.textContent = result.error || 'Failed';
        setTimeout(() => { btn.textContent = 'Run now'; btn.disabled = false; }, 3000);
      }
    });
  });
}

async function selectSection(name) {
  activeSection = name;
  activeFile = null;

  $$('.section-item').forEach(el => el.classList.toggle('active', el.dataset.section === name));

  const header = $('#file-list-header');
  header.textContent = name;
  const filesEl = $('#files');
  filesEl.innerHTML = '<div class="loading">Loading...</div>';

  const res = await fetch('/api/files/' + encodeURIComponent(name));
  const files = await res.json();

  filesEl.innerHTML = '';

  // Update section count
  $$('.section-item').forEach(el => {
    if (el.dataset.section === name) {
      el.innerHTML = name + '<span class="section-count">' + files.length + '</span>';
    }
  });

  // Group files by folder
  const hasFolders = files.some(f => f.folder);
  let currentFolder = undefined;
  let currentContainer = filesEl;

  for (const f of files) {
    if (f.folder !== currentFolder) {
      currentFolder = f.folder;

      if (f.folder) {
        const folderCount = files.filter(ff => ff.folder === f.folder).length;
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-header';
        folderEl.innerHTML = '<span class="folder-arrow">\\u25BE</span>' +
          esc(f.folder) +
          '<span class="folder-count">' + folderCount + '</span>';

        const contentsEl = document.createElement('div');
        contentsEl.className = 'folder-contents';

        folderEl.addEventListener('click', () => {
          folderEl.classList.toggle('collapsed');
          contentsEl.classList.toggle('hidden');
        });

        filesEl.appendChild(folderEl);
        filesEl.appendChild(contentsEl);
        currentContainer = contentsEl;
      } else {
        currentContainer = filesEl;
      }
    }

    const el = document.createElement('div');
    el.className = 'file-item';
    el.dataset.path = f.path;

    let meta = '';
    if (f.dueDate) meta += f.dueDate + ' ';
    if (f.tags && f.tags.length) {
      meta += f.tags.map(t => '<span class="tag">' + esc(String(t)) + '</span>').join('');
    }

    el.innerHTML =
      '<div class="file-name">' + esc(f.name) + '</div>' +
      (meta ? '<div class="file-meta">' + meta + '</div>' : '') +
      (f.excerpt ? '<div class="file-excerpt">' + esc(f.excerpt.replace(/^#+ /, '')) + '</div>' : '');

    el.onclick = () => selectFile(f.path);
    currentContainer.appendChild(el);
  }

  $('#content').innerHTML = '<div class="content-empty">Select a note to view</div>';

  // Mobile: show file list after selecting section
  if (window.innerWidth <= 768) {
    closeMobilePanels();
    document.querySelector('.file-list').classList.add('mobile-show');
    $('#mobile-files-btn').classList.add('active');
    $('#mobile-title').textContent = name;
  }
}

async function selectFile(path) {
  activeFile = path;
  $$('.file-item').forEach(el => el.classList.toggle('active', el.dataset.path === path));

  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading...</div>';

  const res = await fetch('/api/note/' + encodeURIComponent(path));
  const note = await res.json();

  if (note.error) {
    content.innerHTML = '<div class="content-empty">' + esc(note.error) + '</div>';
    return;
  }

  const fm = fmDisplay(note.frontmatter);

  content.innerHTML =
    '<div class="note-path">' + esc(note.path) + '</div>' +
    (fm ? '<div class="note-frontmatter">' + esc(fm) + '</div>' : '') +
    '<div class="note-body">' + md(note.body) + '</div>';

  // Handle wiki-link clicks
  content.querySelectorAll('.wiki-link').forEach(el => {
    el.addEventListener('click', () => {
      const linkName = el.dataset.link;
      searchAndNavigate(linkName);
    });
  });

  // Update URL hash for deep linking
  history.replaceState(null, '', '#/note/' + encodeURIComponent(path));

  // Mobile: close panels, show note
  if (window.innerWidth <= 768) {
    closeMobilePanels();
    $('#mobile-title').textContent = path.split('/').pop().replace('.md', '');
  }
}

async function searchAndNavigate(query) {
  // Try exact name resolution first
  const resolveRes = await fetch('/api/resolve?name=' + encodeURIComponent(query));
  const resolved = await resolveRes.json();

  let targetPath = null;

  if (resolved.path) {
    targetPath = resolved.path;
  } else {
    // Fall back to search
    const res = await fetch('/api/search?q=' + encodeURIComponent(query));
    const results = await res.json();
    if (results.length > 0) {
      targetPath = results[0].path;
    }
  }

  if (targetPath) {
    const section = targetPath.split('/')[0];
    if (activeSection !== section) {
      await selectSection(section);
    }
    await selectFile(targetPath);
  }
}

// Search
let searchTimeout;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  if (!q) {
    if (activeSection) selectSection(activeSection);
    return;
  }
  searchTimeout = setTimeout(async () => {
    const mode = $('#search-mode').value;
    const res = await fetch('/api/search?q=' + encodeURIComponent(q) + '&mode=' + mode);
    const results = await res.json();

    $('#file-list-header').textContent = 'Search: ' + q;
    const filesEl = $('#files');
    filesEl.innerHTML = '';

    // Clear active section
    $$('.section-item').forEach(el => el.classList.remove('active'));

    for (const f of results) {
      const el = document.createElement('div');
      el.className = 'file-item';
      el.dataset.path = f.path;
      const section = f.path.split('/')[0];

      let meta = '<span class="tag">' + esc(section) + '</span>';
      if (f.tags && f.tags.length) {
        meta += f.tags.map(t => '<span class="tag">' + esc(String(t)) + '</span>').join('');
      }

      el.innerHTML =
        '<div class="file-name">' + esc(f.name) + '</div>' +
        '<div class="file-meta">' + meta + '</div>' +
        (f.excerpt ? '<div class="file-excerpt">' + esc(f.excerpt.replace(/^#+ /, '')) + '</div>' : '');

      el.onclick = () => selectFile(f.path);
      filesEl.appendChild(el);
    }

    if (results.length === 0) {
      filesEl.innerHTML = '<div class="loading">No results</div>';
    }
  }, 250);
});

// Re-search when mode changes
$('#search-mode').addEventListener('change', () => {
  const q = $('#search').value.trim();
  if (q) {
    $('#search').dispatchEvent(new Event('input'));
  }
});

// Keyboard shortcut: Cmd/Ctrl+K to focus search
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    $('#search').focus();
    $('#search').select();
  }
});

// Mobile navigation
$('#mobile-sections-btn').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.contains('mobile-show');
  closeMobilePanels();
  if (!isOpen) {
    sidebar.classList.add('mobile-show');
    $('#mobile-sections-btn').classList.add('active');
  }
});

$('#mobile-files-btn').addEventListener('click', () => {
  const fileList = document.querySelector('.file-list');
  const isOpen = fileList.classList.contains('mobile-show');
  closeMobilePanels();
  if (!isOpen) {
    fileList.classList.add('mobile-show');
    $('#mobile-files-btn').classList.add('active');
  }
});

// Hash-based deep link routing: /#/note/Memory/Acme-Corp.md
async function handleHashRoute() {
  const hash = window.location.hash;
  if (!hash) return;

  const match = hash.match(/^#\\/note\\/(.+)$/);
  if (!match) return;

  const notePath = decodeURIComponent(match[1]);
  const section = notePath.split('/')[0];

  // Select the section first to populate the file list
  if (['Inbox', 'Tasks', 'Memory', 'Research', 'Writing'].includes(section)) {
    await selectSection(section);
  }

  // Then select the file
  await selectFile(notePath);
}

// Listen for hash changes (back/forward navigation)
window.addEventListener('hashchange', handleHashRoute);

// Init
loadSections().then(() => handleHashRoute());
</script>

</body>
</html>`;
}
