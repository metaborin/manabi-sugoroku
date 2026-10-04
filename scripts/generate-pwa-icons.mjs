import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Original fox artwork from this project's favicon, composed as a native SVG.
// The complete 288px fox tile fits inside the central 80% maskable safe circle.
const directory = new URL('../public/icons/', import.meta.url);
await mkdir(directory, { recursive: true });
const fox = (await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8'))
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#173f38"/>
<circle cx="256" cy="256" r="228" fill="#2e6450"/>
<path d="M48 407Q108 459 178 424T328 418T475 366" fill="none" stroke="#e6c47d" stroke-width="17" stroke-linecap="round" stroke-dasharray="2 30"/>
<path d="m411 64 8 23 24 8-24 8-8 23-8-23-24-8 24-8z" fill="#ffe9a4"/>
<circle cx="76" cy="151" r="10" fill="#a8be80"/><circle cx="437" cy="284" r="7" fill="#a8be80"/>
<g transform="translate(112 112) scale(4.5)">${fox}</g>
</svg>\n`;
await writeFile(new URL('icon.svg', directory), svg);
const browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined });
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`);
    const png = await page.screenshot({ type: 'png' });
    await writeFile(new URL(`icon-${size}.png`, directory), png);
    if (size === 512) await writeFile(new URL('icon-maskable-512.png', directory), png);
    await page.close();
  }
} finally { await browser.close(); }
