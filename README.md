# CLM Performance Testing (K6)

k6 performance tests for GhostDraft CLM. Current scope is deliberately
narrow: prove out one clean, reusable structure against the **CLM QA**
environment before expanding to other environments or scenarios.

## Status

Working POC: token-based auth (CreationAdmin) + general/filter search
(`status: All` and `status: InProduction`) against CLM QA. This is the
"tangible" first slice - other environments (hub, dev, uat) and other
search types (combined/smart search) are intentionally out of scope for
now.

## Sprint 1 (Foundation & Baseline) status

| Sprint 1 exit criteria | Status |
|---|---|
| Authentication isolated | ✅ `auth/login.ts` |
| Configuration centralised | ✅ for CLM QA (`config/environments.ts` + `k6.env.qa.json`) |
| Scenarios modular | ✅ structurally - only Search is built so far; Upload/Approval/User Validation are Sprint 2+ |
| Baseline metrics documented | ✅ [`docs/baseline-report.md`](docs/baseline-report.md) |

Also see [`docs/technical-debt.md`](docs/technical-debt.md) and
[`docs/endpoint-inventory.md`](docs/endpoint-inventory.md) for the other
two Sprint 1 deliverables.

## Project layout
'''CLMPerformanceTesting/
auth/login.ts              One place to get an access token - import
getCreationAdminAccessToken(env) rather than
writing the token request inline in a test.
config/environments.ts     Reads k6.env.<name>.json (defaults to "qa").
data/searchPayloads.ts     Named, reusable request bodies - add new
search scenarios here instead of hardcoding
JSON inline in a test file.
pages/Search/search.ts     The actual API call (performFilterSearch).
perfTests/Search/filterSearchQA.ts
The runnable test: wires auth + config +
payload + page together.
support/types.ts            Shared TypeScript types - EnvConfig,
SearchPayload, etc. Import from here rather
than redefining types in a test file.
support/enums.ts             UserRole and other shared enums.
teardown/helper.ts           Common cleanup helpers (placeholder for now).'''

## Setup

1. Create `k6.env.qa.json` in the repo root (this file is gitignored -
   never commit it). Shape:

```json
   {
     "PASSWORD": "...",
     "TENANTID": "...",
     "CLIENTSECRET": "...",
     "HUBCLIENTID": "...",
     "REDIRECTURI": "https://clm-qa.southafricanorth.cloudapp.azure.com/",
     "ORGID": "...",
     "ENVIRONMENT": "CLMQA",
     "PUBLICAPIURL": "...",
     "USERDETAILSDATA": {
       "CreationAdmin": {
         "email": "...",
         "name": "Creation Admin",
         "objectId": "...",
         "userId": "..."
       }
     }
   }
```

2. Install [k6](https://k6.io/docs/get-started/installation/) if it isn't
   already on your machine.

## Running the QA filter-search test

```bash
npm run test:qa
```

To also log the full response body of every request (not just failures) -
useful when validating a new payload or environment:

```bash
npm run test:qa:debug
```

To type-check the TypeScript without running k6:

```bash
npm run build
```

## Notes / conventions

- **Relative imports need an explicit `.ts` extension.** k6's native
  TypeScript support resolves modules like a browser/ESM loader, not like
  Node - `from '../auth/login'` will fail with "moduleSpecifier ... couldn't
  be found on local disk". Always write `from '../auth/login.ts'`.
- **No secrets in git.** `k6.env.*.json` and the generated `config.json`
  are both gitignored. If a secret ever ends up committed, rotate it.
- **Import shared code, don't duplicate it.** Types live in `support/types.ts`,
  auth lives in `auth/login.ts`, request bodies live in `data/*.ts`. A perf
  test file should mostly be wiring these together plus k6 `options`/checks.
- **Environments are just files.** `config/environments.ts` reads
  `k6.env.<name>.json` based on `TARGET_ENV` (defaults to `qa`). Adding a
  new environment (dev, uat, hub) is a matter of adding a new env file - no
  code change needed, once that environment is actually in scope.

## Next up (not yet started)

- Combined/smart search - currently blocked on an environment-side
  dependency issue with smart search, independent of this test suite.
- Multi-VU comparison (1 / 10 / 50 / 100 VUs) plotted against response
  time, once the single-VU structure above is confirmed solid.
- JSON output -> Grafana, for a proper dashboard instead of terminal
  metrics.