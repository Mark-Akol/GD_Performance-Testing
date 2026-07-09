import http from 'k6/http';
import { check } from 'k6';
import encoding from 'k6/encoding';
import { UserRole } from '../support/enums.ts';
import type { AccessToken, EnvConfig, UserDetails } from '../support/types.ts';

/**
 * Single place where we acquire a Microsoft OAuth2 access token.
 *
 * This is the "getAccessToken" function Dirk asked for on the call: perf
 * test scripts should import this and call it, rather than re-writing the
 * token request inline in every script.
 *
 * Usage in a test:
 *   import { getCreationAdminAccessToken } from '../../auth/login.ts';
 *   export function setup() {
 *     const { token } = getCreationAdminAccessToken(env);
 *     return { token };
 *   }
 */

function getUser(env: EnvConfig, role: UserRole): UserDetails {
    const user = env.USERDETAILSDATA?.[role];
    if (!user) {
        throw new Error(
            `Missing user details for role "${role}" - add an entry under USERDETAILSDATA in your k6.env.<name>.json`
        );
    }
    return user;
}

// JWT payloads are base64url-encoded. k6's encoding module can decode
// base64url directly (as 'rawurl'), so there's no need for Node's Buffer
// (which doesn't exist in k6's JS runtime - the previous version of this
// file used Buffer.from(...), which would throw at runtime).
function decodeTokenExpiry(token: string): number {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) {
        throw new Error('Unexpected token format: missing payload segment');
    }
    const payloadJson = encoding.b64decode(payloadB64, 'rawurl', 's') as unknown as string;
    const payload = JSON.parse(payloadJson) as { exp: number };
    return payload.exp * 1000;
}

/**
 * Requests a Microsoft OAuth2 (Resource Owner Password Credentials) access
 * token for the given user role and returns it ready to drop into an
 * Authorization header.
 */
export function getAccessToken(env: EnvConfig, role: UserRole = UserRole.CREATION_ADMIN): AccessToken {
    const user = getUser(env, role);
    const tokenUrl = `https://login.microsoftonline.com/${env.TENANTID}/oauth2/v2.0/token`;

    const payload = {
        grant_type: 'password',
        username: user.email,
        password: env.PASSWORD,
        scope: `api://${env.HUBCLIENTID}/user.read`,
        client_id: env.HUBCLIENTID,
        client_secret: env.CLIENTSECRET,
    };

    const params = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };

    const res = http.post(tokenUrl, payload, params);

    check(res, {
        'token response is 200': (r) => r.status === 200,
        'token received': (r) => r.json('access_token') !== null,
    });

    if (res.status !== 200) {
        throw new Error(`Token request failed for role "${role}": ${res.status} ${res.status_text} - ${res.body}`);
    }

    const token = res.json('access_token') as string;
    return { token, exp: decodeTokenExpiry(token) };
}

// Convenience wrapper - CreationAdmin is the only role wired up for the
// current CLM QA POC. Add more USERDETAILSDATA entries + wrappers here as
// other roles are needed.
export const getCreationAdminAccessToken = (env: EnvConfig): AccessToken =>
    getAccessToken(env, UserRole.CREATION_ADMIN);
