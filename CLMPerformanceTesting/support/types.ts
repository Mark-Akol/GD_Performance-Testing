import { UserRole } from './enums.ts';

export interface UserDetails {
    email: string;
    name: string;
    objectId?: string;
    userId?: string;
    publicApiKey?: string;
}

export type UserDetailsMap = Partial<Record<UserRole, UserDetails>> & Record<string, UserDetails>;

export interface EnvConfig {
    PASSWORD: string;
    TENANTID: string;
    CLIENTSECRET: string;
    HUBCLIENTID: string;
    REDIRECTURI: string;
    ORGID: string;
    ENVIRONMENT: string;
    PUBLICAPIURL: string;
    USERDETAILSDATA: UserDetailsMap;
    [key: string]: unknown;
}

export interface AccessToken {
    token: string;
    exp: number;
}

export interface FilterSearchCriteria {
    title?: string,
    formNumber?: string,
    status?: string,
    labels?: string

}
export interface SearchPayload {
    filterSearchCriteria: FilterSearchCriteria,
    searchTerm?: string,
    useSynonyms?: boolean,

}
