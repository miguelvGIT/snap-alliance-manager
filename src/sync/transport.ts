import type { Dataset } from '../domain/model';
import type { Operation, SyncCredentials } from '../data/store';
import { api } from './http';
export type SyncSnapshot = { dataset: Dataset; heads: Record<string, string>; cursor: number };
export type SyncReply = {
  changes: { operation: Operation; conflict: boolean; seq: number }[];
  heads: Record<string, string>;
  cursor: number;
  more: boolean;
};
export interface SyncTransport {
  exchange(
    credentials: SyncCredentials,
    request: { cursor: number; operations: Operation[] },
  ): Promise<SyncReply>;
  entity(credentials: SyncCredentials, key: string): Promise<unknown>;
  snapshot(credentials: SyncCredentials): Promise<SyncSnapshot>;
}
export const httpTransport: SyncTransport = {
  exchange: (credentials, request) =>
    api('/spaces/' + credentials.spaceId + '/sync', request, credentials.token),
  entity: (credentials, key) =>
    api<{ value: unknown }>(
      '/spaces/' + credentials.spaceId + '/entity?key=' + encodeURIComponent(key),
      undefined,
      credentials.token,
    ).then((result) => result.value),
  snapshot: (credentials) =>
    api('/spaces/' + credentials.spaceId + '/snapshot', undefined, credentials.token),
};
