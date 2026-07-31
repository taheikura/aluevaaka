import { chmodSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '.githooks', 'pre-commit');
const targetDir = join(root, '.git', 'hooks');
const target = join(targetDir, 'pre-commit');

try {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, 0o755);
  console.log('Installed Git pre-commit hook.');
} catch (error) {
  // Package installation should still work in environments without a .git directory.
  console.warn(`Could not install Git pre-commit hook: ${error.message}`);
}
