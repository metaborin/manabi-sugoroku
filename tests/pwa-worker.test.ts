import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const origin = 'https://metaborin.github.io';
const scope = '/manabi-sugoroku/';
const prefix = 'metaborin/manabi-sugoroku/';
const builder = fileURLToPath(new URL('../scripts/build-pwa.mjs', import.meta.url));
type Asset = { url: string; bytes: number; integrity: string };
type Manifest = { version: string; totalBytes: number; assets: Asset[] };
type Status = { type: string; offlineReady: boolean; version: string };
type RequestLike = Pick<Request, 'url' | 'method' | 'mode'> & { headers?: Headers };

function buildFixture(t: test.TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'manabi-pwa-test-'));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(directory.includes('manabi-pwa-test-'));
    rmSync(directory, { recursive: true, force: true });
  });
  mkdirSync(join(directory, 'assets', 'nested'), { recursive: true });
  const files = {
    'index.html': '<html>complete game</html>',
    'manifest.webmanifest': '{"name":"game","start_url":"./"}',
    'icon-192.png': 'fixture icon 192',
    'icon-512.png': 'fixture icon 512',
    'assets/game.js': 'console.log("all game questions");',
    'assets/game.css': 'body { color: #123; }',
    'assets/nested/icon ü.svg': '<svg>all game art</svg>',
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(directory, name), content);
  const generate = () => execFileSync(process.execPath, [builder, '--dist', directory], { encoding: 'utf8' });
  generate();
  const manifest = JSON.parse(readFileSync(join(directory, 'precache-manifest.json'), 'utf8')) as Manifest;
  const source = readFileSync(join(directory, 'sw.js'), 'utf8');
  const network = new Map<string, string>();
  for (const asset of manifest.assets) {
    network.set(origin + asset.url, readFileSync(join(directory, decodeURIComponent(asset.url.slice(scope.length))), 'utf8'));
  }
  network.set(`${origin}${scope}precache-manifest.json`, readFileSync(join(directory, 'precache-manifest.json'), 'utf8'));
  return { directory, files, generate, manifest, source, network };
}

function workerHarness(source: string, network: Map<string, string>, varyOrigin = false) {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const storage = new Map<string, Map<string, Response>>();
  const storedHeaders = new Map<string, Map<string, Headers>>();
  const deleted: string[] = [];
  const requests: Request[] = [];
  const notifications: { url: string; message: Status }[] = [];
  let offline = false;
  let failAt = '';
  let networkCalls = 0;
  let forcedUpdates = 0;
  let claims = 0;
  const key = (request: string | RequestLike) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const fetchMock = async (request: RequestLike) => {
    networkCalls += 1;
    if (offline || request.url === failAt) throw new Error('Network unavailable');
    const body = network.get(request.url);
    if (body === undefined) return new Response('not found', { status: 404 });
    return new Response(body, { headers: varyOrigin ? { Vary: 'Origin' } : {} });
  };
  runInNewContext(source, {
    URL, Request,
    self: {
      location: new URL(`${origin}${scope}sw.js`),
      addEventListener: (name: string, callback: (event: Record<string, unknown>) => void) => listeners.set(name, callback),
      skipWaiting: () => { forcedUpdates += 1; },
      clients: {
        claim: () => { claims += 1; },
        matchAll: async () => [
          `${origin}${scope}`, `${origin}${scope}index.html`,
          `${origin}/manabi-monsters-3nen/`, `${origin}/manabi-sugoroku-other/`,
        ].map((url) => ({ url, postMessage: (message: Status) => notifications.push({ url, message }) })),
      },
    },
    caches: {
      keys: async () => [...storage.keys()],
      delete: async (name: string) => { deleted.push(name); return storage.delete(name); },
      match: () => { throw new Error('Origin-wide cache lookup is forbidden'); },
      open: async (name: string) => {
        if (!storage.has(name)) storage.set(name, new Map());
        if (!storedHeaders.has(name)) storedHeaders.set(name, new Map());
        const cache = storage.get(name)!;
        return {
          match: async (request: string | RequestLike) => {
            const response = cache.get(key(request));
            if (response?.headers.get('Vary') === 'Origin') {
              const requestedOrigin = typeof request === 'string' ? null : request.headers?.get('Origin') ?? null;
              const originalOrigin = storedHeaders.get(name)!.get(key(request))?.get('Origin') ?? null;
              if (requestedOrigin !== originalOrigin) return undefined;
            }
            return response?.clone();
          },
          addAll: async (inputs: Request[]) => {
            for (const request of inputs) {
              requests.push(request);
              const response = await fetchMock(request);
              if (!response.ok) throw new Error('Precache response was not successful');
              const hash = createHash('sha256').update(await response.clone().text()).digest('base64');
              if (request.integrity !== `sha256-${hash}`) throw new Error('Integrity mismatch');
              // Deliberately simulate partial writes to verify failure cleanup as well.
              cache.set(key(request), response);
              storedHeaders.get(name)!.set(key(request), new Headers(request.headers));
            }
          },
        };
      },
    },
    fetch: fetchMock,
  });
  async function dispatch(name: string, extra: Record<string, unknown> = {}) {
    let completion: Promise<unknown> | undefined;
    listeners.get(name)!({ ...extra, waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;
  }
  return {
    storage, deleted, requests, notifications,
    setOffline: (value = true) => { offline = value; },
    failAt: (url: string) => { failAt = url; },
    networkCalls: () => networkCalls,
    forcedUpdates: () => forcedUpdates,
    claims: () => claims,
    dispatch,
    async status(sourceUrl = `${origin}${scope}`) {
      let response: Status | undefined;
      await dispatch('message', {
        data: { type: 'GET_OFFLINE_STATUS' }, source: { url: sourceUrl },
        ports: [{ postMessage: (message: Status) => { response = message; } }],
      });
      return response;
    },
    async fetch(request: RequestLike) {
      let response: Promise<Response> | undefined;
      listeners.get('fetch')!({ request, respondWith: (promise: Promise<Response>) => { response = promise; } });
      return response ? { intercepted: true, response: await response } : { intercepted: false };
    },
  };
}

test('PWA build discovers all assets, records bytes and integrity, and is deterministic', (t) => {
  const build = buildFixture(t);
  assert.equal(build.manifest.assets.length, Object.keys(build.files).length);
  assert.match(build.manifest.version, /^[a-f0-9]{64}$/);
  assert.equal(build.manifest.totalBytes, Object.values(build.files).reduce((sum, content) => sum + Buffer.byteLength(content), 0));
  assert.ok(build.manifest.assets.some((asset) => asset.url.endsWith('icon%20%C3%BC.svg')));
  assert.ok(build.manifest.assets.every((asset) => asset.integrity.startsWith('sha256-')));
  build.generate();
  assert.equal(readFileSync(join(build.directory, 'sw.js'), 'utf8'), build.source);
  writeFileSync(join(build.directory, 'assets', 'game.js'), 'changed game questions');
  build.generate();
  const updated = JSON.parse(readFileSync(join(build.directory, 'precache-manifest.json'), 'utf8')) as Manifest;
  assert.notEqual(updated.version, build.manifest.version);
});

test('install precaches the complete build and status works without a controller', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  assert.equal((await worker.status())?.offlineReady, false);
  assert.equal(worker.storage.size, 0);
  await worker.dispatch('install');
  assert.deepEqual([...worker.storage.keys()], [prefix + build.manifest.version]);
  assert.equal(worker.requests.length, build.manifest.assets.length + 1);
  assert.ok(worker.requests.every((request) => request.cache === 'reload' && request.integrity.startsWith('sha256-')));
  const status = await worker.status();
  assert.equal(status?.type, 'OFFLINE_STATUS');
  assert.equal(status?.offlineReady, true);
  assert.equal(status?.version, build.manifest.version);
  assert.equal(worker.notifications.length, 2);
  assert.ok(worker.notifications.every(({ message }) => message.type === 'OFFLINE_READY' && message.offlineReady));
  assert.equal(await worker.status(`${origin}/another-app/`), undefined);
  worker.storage.get(prefix + build.manifest.version)!.delete(`${origin}${scope}assets/game.js`);
  assert.equal((await worker.status())?.offlineReady, false);
});

test('failed or corrupted installation removes a new partial cache and never reports ready', async (t) => {
  const build = buildFixture(t);
  for (const failure of ['network', 'integrity'] as const) {
    const network = new Map(build.network);
    if (failure === 'integrity') network.set(`${origin}${scope}index.html`, 'wrong deployment');
    const worker = workerHarness(build.source, network);
    worker.storage.set('other-app', new Map());
    if (failure === 'network') worker.failAt(`${origin}${scope}index.html`);
    await assert.rejects(worker.dispatch('install'));
    assert.deepEqual([...worker.storage.keys()], ['other-app']);
    assert.deepEqual(worker.deleted, [prefix + build.manifest.version]);
    assert.equal(worker.notifications.length, 0);
    assert.equal((await worker.status())?.offlineReady, false);
  }
});

test('a failed reinstall does not delete an existing active cache', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  await worker.dispatch('install');
  worker.setOffline();
  await assert.rejects(worker.dispatch('install'));
  assert.deepEqual(worker.deleted, []);
  assert.equal((await worker.status())?.offlineReady, true);
});

test('activation cleans only the precise app prefix and retains its current complete cache', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  const survivors = ['another-app', 'manabi-monsters-v0.7.5', 'metaborin/manabi-sugoroku-other/old', 'xmetaborin/manabi-sugoroku/old', 'metaborin/manabi-sugoroku'];
  for (const name of [...survivors, `${prefix}old-build`]) worker.storage.set(name, new Map());
  await worker.dispatch('install');
  await worker.dispatch('activate');
  assert.deepEqual(worker.deleted, [`${prefix}old-build`]);
  assert.deepEqual([...worker.storage.keys()], [...survivors, prefix + build.manifest.version]);
});

test('storage loss before activation preserves an older build', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  await worker.dispatch('install');
  worker.storage.delete(prefix + build.manifest.version);
  worker.storage.set(`${prefix}old-build`, new Map());
  await worker.dispatch('activate');
  assert.deepEqual(worker.deleted, []);
  assert.ok(worker.storage.has(`${prefix}old-build`));
});

test('an installed update remains waiting and cannot force control or reload', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  worker.storage.set(`${prefix}old-active-build`, new Map());
  await worker.dispatch('install');
  await worker.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(worker.forcedUpdates(), 0);
  assert.equal(worker.claims(), 0);
  assert.ok(worker.storage.has(`${prefix}old-active-build`));
  assert.deepEqual(worker.deleted, []);
  assert.doesNotMatch(build.source, /\.reload\s*\(|\.navigate\s*\(/);
});

test('offline fetch uses only its own cache with a scoped index fallback', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  worker.storage.set('other-app', new Map([[`${origin}${scope}index.html`, new Response('foreign page')]]));
  await worker.dispatch('install');
  worker.setOffline();
  const networkBefore = worker.networkCalls();
  const page = await worker.fetch({ url: `${origin}${scope}adventure?resume=1`, method: 'GET', mode: 'navigate' });
  assert.equal(page.intercepted, true);
  assert.equal(await page.response!.text(), build.files['index.html']);
  const script = await worker.fetch({ url: `${origin}${scope}assets/game.js`, method: 'GET', mode: 'cors' });
  assert.equal(await script.response!.text(), build.files['assets/game.js']);
  assert.equal(worker.networkCalls(), networkBefore);
  worker.storage.get(prefix + build.manifest.version)!.delete(`${origin}${scope}index.html`);
  await assert.rejects(worker.fetch({ url: `${origin}${scope}`, method: 'GET', mode: 'navigate' }), /Network unavailable/);
});

test('unknown assets, non-GET requests, foreign origins and sibling apps are not intercepted', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network);
  await worker.dispatch('install');
  const cases: RequestLike[] = [
    { url: `${origin}${scope}assets/unknown.js`, method: 'GET', mode: 'cors' },
    { url: `${origin}${scope}assets/game.js?v=unknown`, method: 'GET', mode: 'cors' },
    { url: `${origin}${scope}index.html`, method: 'POST', mode: 'cors' },
    { url: `${origin}/manabi-monsters-3nen/`, method: 'GET', mode: 'navigate' },
    { url: `${origin}/manabi-sugoroku-other/`, method: 'GET', mode: 'navigate' },
    { url: `https://example.org${scope}index.html`, method: 'GET', mode: 'navigate' },
  ];
  for (const request of cases) assert.equal((await worker.fetch(request)).intercepted, false, request.url);
});

test('precache remains usable offline when module requests add Origin and responses vary by Origin', async (t) => {
  const build = buildFixture(t);
  const worker = workerHarness(build.source, build.network, true);
  await worker.dispatch('install');
  worker.setOffline();
  const calls = worker.networkCalls();
  for (const name of ['assets/game.js', 'assets/game.css'] as const) {
    const result = await worker.fetch({
      url: `${origin}${scope}${name}`, method: 'GET', mode: 'cors', headers: new Headers({ Origin: origin }),
    });
    assert.equal(await result.response!.text(), build.files[name]);
  }
  assert.equal(worker.networkCalls(), calls);
  assert.equal((await worker.status())?.offlineReady, true);
});
