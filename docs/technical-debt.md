# Baseline Performance Report - v1.0

Sprint 1 deliverable: the first real, documented performance baseline for
the CLM QA environment, captured from an actual `k6 run` against the live
system (not a demo/hardcoded environment).

## Test conditions

| | |
|---|---|
| Environment | CLM QA (`clm-qa.southafricanorth.cloudapp.azure.com`) |
| Test user | CreationAdmin (token-based auth, Entra ID ROPC grant) |
| Endpoint | General/filter search (`/api/specification/templatesearch/search`) |
| Payload | `status: All` (returns every template in the environment - a worst-case query, not a typical one) |
| Load profile | 1 VU, ramping 10s → 20s → 5s (~35s active, ~51s wall time incl. graceful stop) |
| Tool | k6 v2.0.0, native TypeScript execution |
| Script | `CLMPerformanceTesting/perfTests/Search/filterSearchQA.ts` |

## Results

| Metric | Value |
|---|---|
| Checks passed | 4/4 (100%) - token issued, token received, search returned 200 |
| Error rate (`http_req_failed`) | 0.00% |
| Response time - avg | 16.65s (includes 1 fast token call + 2 slow search calls) |
| Response time - search only (`filter_search_status_all_response_time`) | avg 24.76s / min 23.74s / max 25.78s / p(90) 25.57s / p(95) 25.68s |
| Data received | 13 MB (~257 kB/s) |
| Data sent | 30 kB |
| Iterations completed | 2, 0 interrupted |

A second run (also single-VU, same `status: All` payload) came back close to
this - p(95) ≈ 31.4s - consistent with the first run within normal variance
for a full-catalogue query.

## Interpretation

- **Correctness: solid.** Auth and search both work end-to-end against real
  CLM QA, with a 0% error rate on `status: All`. This is the "tangible"
  result the project needed to prove the structure out.
- **Speed: expected to look slow, and does.** `status: All` asks the
  environment to return every template it has - the 13 MB response size is
  the tell. ~24-31 seconds for that specific query is a real number worth
  keeping, but it should **not** be read as "the system is slow" in
  general - it's a worst-case query.
- The first threshold set for this payload (`p(95)<5000`) was an untested
  guess and correctly failed against real data. It's been replaced with
  `p(95)<35000`, seeded directly from these runs.

## A note on the second payload

An earlier version of this test used `status: Approved` as a "typical
case" comparison payload. That value was a guess, and it was wrong - CLM
QA's `StatusFilter` returned a 400 (`Error converting value "Approved" to
type ...StatusFilter`) on every request.

The real status values were confirmed directly from the CLM QA UI's
Filter Search → Status dropdown (via browser dev tools → Network →
Payload), rather than guessed a second time:

- `All`
- `InProgress`
- `InProduction`
- `Retired`

The test now uses **`status: InProduction`** as the narrower comparison
payload (`data/searchPayloads.ts`, `statusInProduction`).

## Known limitations of this baseline (v1.0)

- **Single VU only.** This does not yet tell us how the system behaves
  under concurrent load - only that one user, one request at a time, works.
- **Only `status: All` has real numbers so far.** `status: InProduction`
  is now correctly configured but hasn't been run against QA yet at the
  time of writing.

## Next data points needed (to reach v1.1)

1. Run `npm run test:qa` with the corrected script (runs `status_all` then
   `status_in_production`) and capture both sets of numbers.
2. One run at a higher VU count (e.g. 5-10 VUs) to close Sprint 1's
   "record virtual user behaviour" deliverable.

Once those two data points come in, this report should be updated (or a
v1.1 appended) rather than re-measuring from scratch.