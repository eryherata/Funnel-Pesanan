import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const targets = [path.join(backendRoot, 'src'), path.join(backendRoot, 'scripts')];

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(m?js)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const files = targets.flatMap(collectFiles).sort();
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}
if (!failed) console.log(`Syntax check passed for ${files.length} file(s).`);
process.exit(failed ? 1 : 0);
