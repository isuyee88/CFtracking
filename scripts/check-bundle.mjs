#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
if (/(?:^|\n)\s*(?:import|export)\s+[^;\n]*cftracking-plugins/.test(worker) || worker.includes('require("../../cftracking-plugins')) {
  throw new Error('external cftracking-plugins import in worker.js');
}
if (!existsSync(new URL('../assets/index.html', import.meta.url))) throw new Error('missing assets/index.html');
const secretPatterns = [
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*['"][^'"]{8,}/,
  /D1_ACCESS_KEY\s*[:=]\s*['"][^'"]{8,}/,
  /POSTBACK_KEY\s*[:=]\s*['"][^'"]{8,}/,
  /BRIGHTDATA_API_KEY\s*[:=]\s*['"][^'"]{8,}/,
];
for (const pattern of secretPatterns) {
  if (pattern.test(worker)) throw new Error('possible secret literal in worker.js');
}
console.log('bundle check ok, bytes=' + worker.length);
