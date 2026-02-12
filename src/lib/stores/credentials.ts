/**
 * Credential and integration management stores.
 */

import { writable, derived } from 'svelte/store';
import type { CredentialInfo, IntegrationInfo } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** List of stored credentials (metadata only, no secret values) */
export const credentials = writable<CredentialInfo[]>([]);

/** List of available integrations with connection status */
export const integrations = writable<IntegrationInfo[]>([]);

/** Whether an OAuth flow is in progress */
export const oauthLoading = writable<string | null>(null);

/** Connected integrations count */
export const connectedCount = derived(integrations, ($i) => $i.filter((i) => i.connected).length);

/** Request the list of credentials from the CVM */
export function requestCredentials(): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'credentials.list',
    timestamp: Date.now(),
    payload: {},
  });
}

/** Request the list of integrations from the CVM */
export function requestIntegrations(): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'integrations.list',
    timestamp: Date.now(),
    payload: { filter: 'all' },
  });
}

/** Store an API key credential */
export function setCredential(
  service: string,
  label: string,
  credentialType: 'api_key' | 'token',
  value: string
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'credentials.set',
    timestamp: Date.now(),
    payload: { service, label, credentialType, value },
  });
}

/** Delete a credential */
export function deleteCredential(service: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'credentials.delete',
    timestamp: Date.now(),
    payload: { service },
  });
}

/** Initiate an OAuth flow for a service */
export function initiateOAuth(service: string, scopes: string[]): void {
  oauthLoading.set(service);
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'oauth.init',
    timestamp: Date.now(),
    payload: { service, scopes },
  });
}

/** Set up message handlers for credential/integration responses */
export function initCredentialHandlers(): void {
  wsClient.on('credentials.response', (msg) => {
    const payload = msg.payload as { credentials: CredentialInfo[] };
    credentials.set(payload.credentials);
  });

  wsClient.on('integrations.response', (msg) => {
    const payload = msg.payload as { integrations: IntegrationInfo[] };
    integrations.set(payload.integrations);
  });

  wsClient.on('oauth.status', (msg) => {
    const payload = msg.payload as { service: string; authUrl?: string; authenticated: boolean };
    if (payload.authUrl) {
      // Open the OAuth authorization URL in a new window
      window.open(payload.authUrl, '_blank', 'width=600,height=700');
    }
    if (payload.authenticated) {
      oauthLoading.set(null);
      // Refresh integrations list
      requestIntegrations();
      requestCredentials();
    }
  });

  wsClient.on('oauth.callback', (msg) => {
    const payload = msg.payload as { service: string; success: boolean };
    oauthLoading.set(null);
    if (payload.success) {
      requestIntegrations();
      requestCredentials();
    }
  });
}
