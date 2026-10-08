import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extractLinkedInJob } from '../extension/LinkedInJobOS/content.js';

const source = new URL('../extension/LinkedInJobOS/', import.meta.url);

test('extension has only explicit active-tab permission and blocks network connections', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', source), 'utf8'));
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  for (const key of ['host_permissions', 'optional_host_permissions', 'content_scripts', 'background', 'externally_connectable']) {
    assert.equal(manifest[key], undefined, key);
  }
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  for (const filename of readdirSync(source).filter(name => name.endsWith('.js'))) {
    const js = readFileSync(new URL(filename, source), 'utf8');
    assert.doesNotMatch(js, /\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(|chrome\.storage|innerHTML\s*=/, filename);
    assert.doesNotMatch(js, /save_profile|save_job|37\.27\.80\.77|http:\/\//, filename);
  }
});

function withPage(href, elements, fn, scripts = []) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { location: { href } };
  globalThis.document = {
    querySelector: selector => elements[selector],
    querySelectorAll: () => scripts,
    get body() { throw new Error('Extraction must never read arbitrary page body'); }
  };
  try { return fn(); }
  finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
}

test('rejects spoofed domains, profile pages, non-HTTPS pages and malformed job IDs', () => {
  for (const url of [
    'https://linkedin.com.attacker.example/jobs/view/123/',
    'https://attacker.example/linkedin.com/jobs/view/123/',
    'http://www.linkedin.com/jobs/view/123/',
    'https://www.linkedin.com/in/example/',
    'https://www.linkedin.com/jobs/view/123/extra',
    'https://www.linkedin.com/jobs/search/?currentJobId=invalid'
  ]) {
    withPage(url, {}, () => assert.throws(extractLinkedInJob, /Open a LinkedIn job/));
  }
});

test('extracts bounded plain-text job fields and removes tracking/query information', () => {
  const job = withPage('https://www.linkedin.com/jobs/view/123/?trackingId=private', {
    h1: { innerText: 'Sample job' },
    '.jobs-description__content': { innerText: 'a'.repeat(30_000) }
  }, extractLinkedInJob);
  assert.equal(job.title, 'Sample job');
  assert.equal(job.description.length, 20_000);
  assert.equal(job.url, 'https://www.linkedin.com/jobs/view/123/');
  assert.deepEqual(Object.keys(job), ['title', 'company', 'location', 'description', 'url', 'source']);
});

test('malformed metadata falls back safely and never copies its HTML description', () => {
  const scripts = [
    { textContent: 'invalid JSON' },
    { textContent: JSON.stringify({ '@type': 'JobPosting', title: 'Synthetic vacancy', description: '<script>secret</script>' }) }
  ];
  const job = withPage('https://www.linkedin.com/jobs/search/?currentJobId=456', {}, extractLinkedInJob, scripts);
  assert.equal(job.title, 'Synthetic vacancy');
  assert.equal(job.description, '');
  assert.equal(job.url, 'https://www.linkedin.com/jobs/view/456/');
});

test('rejects missing titles rather than exporting arbitrary page contents', () => {
  withPage('https://www.linkedin.com/jobs/view/123/', {}, () => assert.throws(extractLinkedInJob, /Could not read a job title/));
});

let popupFixtureId = 0;
async function withPopup(url, fn) {
  const originalDocument = globalThis.document;
  const originalChrome = globalThis.chrome;
  const elements = Object.fromEntries(['preview', 'download', 'status', 'result'].map(id => [id, {
    disabled: id === 'download', hidden: id === 'result', listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }]));
  const injections = [];
  const links = [];
  globalThis.document = {
    getElementById: id => elements[id],
    createElement: () => {
      const anchor = { click() { links.push(anchor); } };
      return anchor;
    }
  };
  globalThis.chrome = {
    tabs: { query: async () => [{ id: 1, url }] },
    scripting: { executeScript: async options => {
      injections.push(options);
      return [{ result: { title: '<img src=x onerror=alert(1)>', url: 'https://www.linkedin.com/jobs/view/123/' } }];
    } }
  };
  try {
    await import(new URL(`../extension/LinkedInJobOS/popup.js?fixture=${popupFixtureId++}`, import.meta.url));
    await fn(elements, injections, links);
  } finally {
    globalThis.document = originalDocument;
    globalThis.chrome = originalChrome;
  }
}

test('popup does not read at startup and requires separate preview and download clicks', async () => {
  await withPopup('https://www.linkedin.com/jobs/view/123/', async (elements, injections, links) => {
    assert.equal(injections.length, 0);
    assert.equal(elements.download.disabled, true);
    await elements.preview.listeners.click();
    assert.equal(injections.length, 1);
    assert.deepEqual(injections[0].target, { tabId: 1 });
    assert.equal(injections[0].func, extractLinkedInJob);
    assert.match(elements.result.textContent, /<img src=x onerror=alert\(1\)>/);
    assert.equal(elements.result.innerHTML, undefined);
    assert.equal(elements.download.disabled, false);
    assert.equal(links.length, 0);
    elements.download.listeners.click();
    assert.equal(links.length, 1);
    assert.equal(links[0].download, 'jobos-reviewed-job.json');
    assert.match(links[0].href, /^blob:/);
  });
});

test('popup rejects spoofed active-tab hosts without reading or exporting', async () => {
  await withPopup('https://linkedin.com.attacker.example/jobs/view/123/', async (elements, injections, links) => {
    await elements.preview.listeners.click();
    elements.download.listeners.click();
    assert.equal(injections.length, 0);
    assert.equal(links.length, 0);
    assert.equal(elements.download.disabled, true);
    assert.equal(elements.result.hidden, true);
    assert.match(elements.status.textContent, /Open a LinkedIn job posting/);
  });
});
