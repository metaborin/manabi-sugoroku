import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('install identity stays inside this app and declared raster icons match their real sizes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  for (const field of ['id', 'start_url', 'scope']) assert.equal(manifest[field], '/manabi-sugoroku/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'ja');
  assert.ok(manifest.name && manifest.short_name);
  for (const [src, sizes, purpose] of [
    ['icons/icon-192.png', '192x192', 'any'],
    ['icons/icon-512.png', '512x512', 'any'],
    ['icons/icon-maskable-512.png', '512x512', 'maskable'],
  ]) {
    const icon = manifest.icons.find((entry: { src: string }) => entry.src === src);
    assert.deepEqual(icon, { src, sizes, type: 'image/png', purpose });
    const png = await readFile(new URL(`../public/${src}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, sizes);
    if (purpose === 'maskable') assert.equal(png[25], 2, 'maskable PNG is opaque RGB');
  }
});
