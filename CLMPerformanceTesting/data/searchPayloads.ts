import type { SearchPayload } from '../support/types.ts';

/**
 * Named, reusable filter-search payloads for the CLM QA POC.
 *
 * We called out that hardcoding request bodies inline in each test is
 * exactly what we're moving away from - add new named payloads here as
 * more search scenarios get identified, and tests just pick the one they
 * need instead of typing out the JSON again.
 *
 * Status values were confirmed directly from the CLM QA UI's Status filter
 * dropdown (via browser dev tools -> Network -> Payload), not guessed:
 * the only valid values are "All", "InProgress", "InProduction", "Retired".
 */
export const searchPayloads: Record<string, SearchPayload> = {
    // Returns every template on the environment - the simplest possible
    // "tangible" search, and the one used in Dirk's own walkthrough. Expect
    // this to be slow (large response) - it's a worst-case baseline, not a
    // typical user action.
    statusAll: {
        filterSearchCriteria: {
            status: 'All',
        },
        useSynonyms: false,
    },

    // A narrower, more realistic user search - filters down to templates
    // that are live/in production, instead of returning everything.
    // Useful as a "typical case" comparison point against statusAll's
    // "worst case".
    statusInProduction: {
        filterSearchCriteria: {
            status: 'InProduction',
        },
        useSynonyms: false,
    },
};