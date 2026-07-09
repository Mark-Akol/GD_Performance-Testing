import http, { type RefinedResponse, type ResponseType } from 'k6/http';
import type { EnvConfig, SearchPayload } from '../../support/types.ts';

/**
 * Calls the CLM general/filter search endpoint - the same call the app UI
 * makes from Search Templates -> Filter Search - and returns the raw k6
 * response so the calling test can run its own checks/metrics on it.
 */
export function performFilterSearch(
    env: EnvConfig,
    token: string,
    searchPayload: SearchPayload
): RefinedResponse<ResponseType | undefined> {
    const baseUrl = env.REDIRECTURI.replace(/\/$/, '');
    const url = `${baseUrl}/api/specification/templatesearch/search`;

    const params = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-ghostdraft-organization': env.ORGID,
        },
        timeout: '10m',
    };

    return http.post(url, JSON.stringify(searchPayload), params);
}
