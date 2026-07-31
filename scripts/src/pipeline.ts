#!/usr/bin/env tsx
/**
 * Data pipeline entry point.
 * Run: pnpm --filter @aluevaaka/scripts pipeline
 */
import { generate } from './generate.js';

generate().catch((err) => {
  console.error(JSON.stringify({ level: 'ERROR', msg: 'pipeline_failed', error: String(err) }));
  process.exit(1);
});
