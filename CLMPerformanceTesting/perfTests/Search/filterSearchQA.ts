import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import type { Options } from 'k6/options';
import { getCreationAdminAccessToken } from '../../auth/login.ts';
import { performFilterSearch } from '../../pages/Search/search.ts';
import { searchPayloads } from '../../data/searchPayloads.ts';
import { getEnv } from '../../config/environments.ts';
import type { SearchPayload } from '../../support/types.ts';

/**
 * CLM QA - general/filter search POC.
 *
 * Runs two comparable searches back-to-back (sequenced with startTime, so
 * they don't compete for the same VU and skew each other's numbers):
 *   1. status: All          - worst case, returns every template in the environment. Kept at 1 VU deliberately - each request pulls the full catalogue, so 5 of these running concurrently would be an unnecessarily heavy hit on QA for this check.
 *   2. status: InProduction - a narrower, more typical user search. Ramps up to 5 concurrent VUs to give us real virtual-user/concurrency data (Sprint 1's last open item) on a lightweight, safe payload.
 *
 * Both status values were confirmed directly from the CLM QA UI's Status
 * dropdown (not guessed) - see data/searchPayloads.ts for the full list.
 *
 * Run it:
 *   npm run test:qa
 *
 * Run it with full response bodies logged (not just failures):
 *   npm run test:qa:debug
 */

const DEBUG_RESPONSES = __ENV.DEBUG_RESPONSES === 'true';

const env = getEnv();

export const options: Options = {
    scenarios: {
        status_all: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '10s', target: 1 }, // warm-up
                { duration: '20s', target: 1 }, // baseline - deliberately single-VU, this payload is a heavy full-catalogue dump
                { duration: '5s', target: 0 }, // ramp down
            ],
            gracefulRampDown: '30s',
            exec: 'searchAllFlow',
        },
        status_in_production: {
            executor: 'ramping-vus',
            startVUs: 1,
            startTime: '40s', // run after status_all's scenario has fully wound down
            stages: [
                { duration: '10s', target: 5 }, // ramp up to 5 concurrent VUs
                { duration: '20s', target: 5 }, // hold at 5 VUs - this is our concurrency data point
                { duration: '5s', target: 0 }, // ramp down
            ],
            gracefulRampDown: '30s',
            exec: 'searchInProductionFlow',
        },
    },
    thresholds: {
        // status:All returns every template in the environment - tens of
        // seconds is expected for that, it's a worst-case call, not a fast
        // one. This number is seeded from real QA runs (p(95) ~23-31s for
        // statusAll) - recalibrate as more runs come in.
        'http_req_duration{scenario:status_all}': ['p(95)<35000'],
        'http_req_duration{scenario:status_in_production}': ['p(95)<10000'],
        http_req_failed: ['rate<0.01'],
    },
};

const successfulRequests = new Counter('successful_requests');
const successRate = new Rate('success_rate');
const statusAllDuration = new Trend('filter_search_status_all_response_time');
const statusInProductionDuration = new Trend('filter_search_status_in_production_response_time');

export function setup(): { token: string } {
    const { token } = getCreationAdminAccessToken(env);
    return { token };
}

function runSearch(token: string, payload: SearchPayload, trend: Trend, label: string): void {
    const response = performFilterSearch(env, token, payload);

    if (DEBUG_RESPONSES || response.status !== 200) {
        console.log(`[${label}] ${response.status} ${response.status_text}`);
        console.log(response.body);
    }

    const wasSuccessful = response.status === 200;
    successfulRequests.add(wasSuccessful ? 1 : 0);
    successRate.add(wasSuccessful);
    trend.add(response.timings.duration);

    check(response, {
        [`${label} status is 200`]: (res) => res.status === 200,
    });
}

export function searchAllFlow(data: { token: string }): void {
    runSearch(data.token, searchPayloads.statusAll, statusAllDuration, 'filter search (status: All)');
}

export function searchInProductionFlow(data: { token: string }): void {
    runSearch(
        data.token,
        searchPayloads.statusInProduction,
        statusInProductionDuration,
        'filter search (status: InProduction)'
    );
}

export default searchAllFlow;