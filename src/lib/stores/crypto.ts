/**
 * Svelte store for E2E crypto state.
 */

import { writable } from 'svelte/store';

export type E2EState = 'none' | 'generating' | 'handshaking' | 'established' | 'error';

export const e2eState = writable<E2EState>('none');
export const e2eError = writable<string | null>(null);
