/**
 * Post-tsc bundle step.
 * Produces a single lambda.zip suitable for Lambda deployment.
 * esbuild re-bundles the compiled JS to ensure tree-shaking and
 * removes the AWS SDK (available in the Lambda runtime) from the bundle.
 */
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ZipArchive } from 'archiver';
import { build } from 'esbuild';

const __dirname = new URL('.', import.meta.url).pathname;
const root = join(__dirname, '..');
const bundleDir = join(root, 'bundle');
const isProduction = process.env.NODE_ENV === 'production';

if (existsSync(bundleDir)) {
  rmSync(bundleDir, { recursive: true });
}
mkdirSync(bundleDir, { recursive: true });

await build({
  entryPoints: [join(root, 'dist', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outfile: join(bundleDir, 'index.mjs'),
  // AWS SDK v3 is available in the Lambda runtime — exclude it to keep the
  // bundle small. Remove this line if you need a specific version pinned.
  external: ['@aws-sdk/*'],
  minify: isProduction,
  sourcemap: isProduction ? 'inline' : true,
  banner: {
    // ESM Lambda handler shim — Lambda looks for handler on the export object
    js: '',
  },
});

// Create zip for CDK/Terraform asset upload without requiring the host's zip CLI.
const zipPath = join(root, 'lambda.zip');
await new Promise((resolve, reject) => {
  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(bundleDir, false);
  archive.finalize();
});

console.log('Bundle written to services/recommendation/lambda.zip');
