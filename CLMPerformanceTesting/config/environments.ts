import type { EnvConfig } from '../support/types.ts';

/**
 * Single place tests read environment config from.
 *
 * Only CLM QA is wired up right now (per current scope - hub is deliberately
 * out for the moment). __ENV.TARGET_ENV defaults to 'qa' so this is ready to
 * grow into "select your environment in the terminal" once a second env
 * config file (e.g. k6.env.dev.json) exists alongside this one - just add
 * a file, no code change needed here.
 *
 * Run with a different env: k6 run -e TARGET_ENV=qa ...
 */
const targetEnv = __ENV.TARGET_ENV || 'qa';

// Path is resolved relative to this file by k6, not the entry script - keep
// k6.env.<name>.json at the repo root (gitignored, never commit real secrets).
const env = JSON.parse(open(`../../k6.env.${targetEnv}.json`)) as EnvConfig;

export function getEnv(): EnvConfig {
    return env;
}
