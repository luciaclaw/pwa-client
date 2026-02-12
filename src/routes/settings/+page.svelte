<script lang="ts">
  import { connectionState, connect, disconnect, isConnected } from '$lib/stores/websocket.js';
  import { requestPermission, notificationPermission } from '$lib/stores/notifications.js';
  import {
    integrations,
    credentials,
    oauthLoading,
    requestIntegrations,
    requestCredentials,
    initiateOAuth,
    deleteCredential,
    setCredential,
    initCredentialHandlers,
  } from '$lib/stores/credentials.js';
  import {
    preferences,
    preferencesLoaded,
    requestPreferences,
    setPreference,
    initPreferencesHandlers,
  } from '$lib/stores/preferences.js';
  import type { CredentialInfo } from '@luciaclaw/protocol';
  import { onMount } from 'svelte';

  const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';
  let serverUrl = $state(DEFAULT_WS_URL);
  let connecting = $state(false);

  // Personality state
  const TONE_PRESETS = ['friendly', 'professional', 'casual', 'concise', 'verbose'] as const;
  let selectedTone = $state('');
  let customInstructions = $state('');
  let personalitySaving = $state(false);

  // Sync personality fields from server preferences
  $effect(() => {
    if ($preferencesLoaded) {
      selectedTone = $preferences['personality_tone'] || '';
      customInstructions = $preferences['personality_instructions'] || '';
    }
  });

  // API key input state per service
  let apiKeyInputs: Record<string, string> = $state({});

  // Group credentials by service for multi-account display
  let credentialsByService = $derived(
    ($credentials).reduce<Record<string, CredentialInfo[]>>((acc, cred) => {
      if (!acc[cred.service]) acc[cred.service] = [];
      acc[cred.service].push(cred);
      return acc;
    }, {})
  );

  onMount(() => {
    initCredentialHandlers();
    initPreferencesHandlers();
  });

  // Fetch integrations and preferences when connected
  $effect(() => {
    if ($isConnected) {
      requestIntegrations();
      requestCredentials();
      requestPreferences();
    }
  });

  async function handleConnect() {
    connecting = true;
    try {
      await connect(serverUrl);
    } catch {
      // Error state handled by store
    } finally {
      connecting = false;
    }
  }

  async function handleNotificationPermission() {
    await requestPermission();
  }

  function handleOAuth(service: string, scopes: string[], account?: string) {
    if (account) {
      initiateOAuth(service, scopes, account);
    } else {
      initiateOAuth(service, scopes);
    }
  }

  function handleConnectAnother(service: string, scopes: string[]) {
    const label = prompt('Account label (e.g., "personal", "work"):');
    if (label && label.trim()) {
      initiateOAuth(service, scopes, label.trim());
    }
  }

  function handleDisconnect(service: string, account?: string) {
    deleteCredential(service, account);
  }

  function handleApiKeySubmit(service: string, name: string) {
    const value = apiKeyInputs[service];
    if (!value?.trim()) return;
    setCredential(service, `${name} Bot Token`, 'api_key', value.trim());
    apiKeyInputs[service] = '';
  }

  function getServiceCredentials(service: string): CredentialInfo[] {
    return credentialsByService[service] || [];
  }

  function savePersonality() {
    personalitySaving = true;
    setPreference('personality_tone', selectedTone);
    setPreference('personality_instructions', customInstructions);
    // Visual feedback — reset after short delay
    setTimeout(() => { personalitySaving = false; }, 800);
  }
</script>

<div class="settings">
  <h2>Settings</h2>

  <section>
    <h3>Connection</h3>
    <div class="form-group">
      <label for="server-url">Agent CVM URL</label>
      <input
        id="server-url"
        type="text"
        bind:value={serverUrl}
        placeholder="ws://localhost:8080/ws"
      />
    </div>
    <div class="form-group">
      <label>Status</label>
      <span class="status" class:connected={$connectionState === 'encrypted'}>
        {$connectionState}
      </span>
    </div>
    <div class="actions">
      {#if $connectionState === 'encrypted'}
        <button class="btn" onclick={disconnect}>Disconnect</button>
      {:else}
        <button class="btn btn-primary" onclick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
      {/if}
    </div>
  </section>

  <section>
    <h3>Agent Personality</h3>
    {#if !$isConnected}
      <p class="placeholder-text">
        Connect to the Agent CVM to customize your agent's personality.
      </p>
    {:else}
      <div class="form-group">
        <label>Tone</label>
        <div class="tone-presets">
          {#each TONE_PRESETS as tone}
            <button
              class="tone-btn"
              class:active={selectedTone === tone}
              onclick={() => { selectedTone = selectedTone === tone ? '' : tone; }}
            >
              {tone}
            </button>
          {/each}
        </div>
      </div>
      <div class="form-group">
        <label for="custom-instructions">Custom instructions</label>
        <textarea
          id="custom-instructions"
          bind:value={customInstructions}
          placeholder="e.g., Always respond in Spanish, Use bullet points, Be sarcastic..."
          rows="3"
        ></textarea>
      </div>
      <div class="actions">
        <button
          class="btn btn-primary"
          onclick={savePersonality}
          disabled={personalitySaving}
        >
          {personalitySaving ? 'Saved!' : 'Save personality'}
        </button>
      </div>
    {/if}
  </section>

  <section>
    <h3>Integrations</h3>
    {#if !$isConnected}
      <p class="placeholder-text">
        Connect to the Agent CVM to manage integrations. All credentials are stored
        encrypted inside the TEE — never on your device.
      </p>
    {:else if $integrations.length === 0}
      <p class="placeholder-text">Loading integrations...</p>
    {:else}
      <div class="integration-list">
        {#each $integrations as integration}
          {@const serviceCreds = getServiceCredentials(integration.service)}
          <div class="integration-card" class:connected={integration.connected}>
            <div class="integration-header">
              <div class="integration-info">
                <span class="integration-name">{integration.name}</span>
                <span class="integration-desc">{integration.description}</span>
              </div>
              <span class="integration-badge" class:connected={integration.connected}>
                {integration.connected ? (serviceCreds.length > 1 ? `${serviceCreds.length} accounts` : 'Connected') : 'Not connected'}
              </span>
            </div>
            <div class="integration-capabilities">
              {#each integration.capabilities.slice(0, 4) as cap}
                <span class="capability-tag">{cap}</span>
              {/each}
            </div>

            {#if serviceCreds.length > 0}
              <div class="account-list">
                {#each serviceCreds as cred}
                  <div class="account-row">
                    <span class="account-label">{cred.label}{cred.account ? ` (${cred.account})` : ''}</span>
                    <button
                      class="btn btn-danger btn-sm"
                      onclick={() => handleDisconnect(cred.service, cred.account)}
                    >
                      Disconnect
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="integration-actions">
              {#if integration.authType === 'oauth'}
                {#if !integration.connected}
                  <button
                    class="btn btn-primary"
                    onclick={() => handleOAuth(integration.service, integration.requiredScopes || [])}
                    disabled={$oauthLoading === integration.service}
                  >
                    {$oauthLoading === integration.service ? 'Connecting...' : 'Connect with OAuth'}
                  </button>
                {:else}
                  <button
                    class="btn"
                    onclick={() => handleConnectAnother(integration.service, integration.requiredScopes || [])}
                    disabled={$oauthLoading === integration.service}
                  >
                    Connect another account
                  </button>
                {/if}
              {:else if integration.authType === 'api_key'}
                {#if !integration.connected}
                  <div class="api-key-form">
                    <input
                      type="password"
                      placeholder="Bot token or API key"
                      bind:value={apiKeyInputs[integration.service]}
                      onkeydown={(e) => { if (e.key === 'Enter') handleApiKeySubmit(integration.service, integration.name); }}
                    />
                    <button
                      class="btn btn-primary"
                      onclick={() => handleApiKeySubmit(integration.service, integration.name)}
                      disabled={!apiKeyInputs[integration.service]?.trim()}
                    >
                      Connect
                    </button>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <h3>Notifications</h3>
    <div class="form-group">
      <label>Permission</label>
      <span>{$notificationPermission}</span>
    </div>
    {#if $notificationPermission === 'default'}
      <button class="btn" onclick={handleNotificationPermission}>Enable Notifications</button>
    {/if}
  </section>
</div>

<style>
  .settings {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 2rem;
  }

  section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  input[type="text"],
  input[type="password"] {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    font-family: var(--font-mono);
  }

  input[type="text"]:focus,
  input[type="password"]:focus {
    border-color: var(--color-primary);
  }

  .status {
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }

  .status.connected {
    color: var(--color-success);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--color-surface-hover);
    transition: background 0.15s;
    cursor: pointer;
    border: none;
    color: var(--color-text);
  }

  .btn:hover:not(:disabled) {
    background: var(--color-border);
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-danger {
    background: transparent;
    border: 1px solid var(--color-error);
    color: var(--color-error);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--color-error);
    color: white;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .placeholder-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .integration-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .integration-card {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .integration-card.connected {
    border-color: var(--color-success);
  }

  .integration-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .integration-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .integration-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .integration-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .integration-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .integration-badge.connected {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .integration-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  .capability-tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    background: var(--color-surface-hover);
    font-family: var(--font-mono);
  }

  .account-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
  }

  .account-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .account-label {
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  .integration-actions {
    display: flex;
    gap: 0.5rem;
  }

  .api-key-form {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .api-key-form input {
    flex: 1;
    min-width: 0;
  }

  textarea {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
  }

  textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .tone-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tone-btn {
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 500;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    text-transform: capitalize;
  }

  .tone-btn:hover {
    background: var(--color-border);
  }

  .tone-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
</style>
