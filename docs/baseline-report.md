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
| Response time - search only (`filter_search_response_time`) | avg 24.76s / min 23.74s / max 25.78s / p(90) 25.57s / p(95) 25.68s |
| Data received | 13 MB (~257 kB/s) |
| Data sent | 30 kB |
| Iterations completed | 2, 0 interrupted |

## Interpretation

- **Correctness: solid.** Auth and search both work end-to-end against real
  CLM QA, with a 0% error rate. This is the "tangible" result the project
  needed to prove the structure out.
- **Speed: expected to look slow, and does.** `status: All` asks the
  environment to return every template it has - the 13 MB response size is
  the tell. ~24-26 seconds for that specific query is a real number worth
  keeping, but it should **not** be read as "the system is slow" in
  general - it's a worst-case query.
- The first threshold we set (`p(95)<5000`) was an untested guess and
  correctly failed against this data. It's now been replaced with
  `p(95)<30000` for this specific payload, seeded directly from this run.

## Known limitations of this baseline (v1.0)

- **Single VU only.** This does not yet tell us how the system behaves
  under concurrent load - only that one user, one request at a time, works
  and takes ~25s for a full-catalogue search.
- **One payload only.** A second, narrower payload (`status: Approved`) has
  since been added to the test (`status_approved` scenario) as a more
  typical-case comparison, but hasn't been run against QA yet at the time
  of writing.

## Next data points needed (to reach v1.1)

1. Re-run `npm run test:qa` with the current script (now runs both
   `status_all` and `status_approved` scenarios back-to-back) and capture
   the `status_approved` numbers alongside this baseline.
2. One run at a higher VU count (e.g. 5-10 VUs) to start closing Sprint 1's
   "record virtual user behaviour" deliverable.

Once those two data points come in, this report should be updated (or a
v1.1 appended) rather than re-measuring from scratch.
