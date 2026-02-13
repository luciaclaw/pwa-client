<script lang="ts">
  import { connectionState, connect, disconnect, isConnected } from '$lib/stores/websocket.js';
  import { requestPermission, notificationPermission } from '$lib/stores/notifications.js';
  import {
    integrations, credentials, oauthLoading,
    requestIntegrations, requestCredentials, initiateOAuth, deleteCredential, setCredential, initCredentialHandlers,
  } from '$lib/stores/credentials.js';
  import {
    preferences, preferencesLoaded, requestPreferences, setPreference, initPreferencesHandlers,
  } from '$lib/stores/preferences.js';
  import type { CredentialInfo } from '@luciaclaw/protocol';
  import { onMount } from 'svelte';
  import { Bell, Wifi, WifiOff, User } from '@lucide/svelte';
  import Section from '$lib/components/Section.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import IntegrationCard from '$lib/components/IntegrationCard.svelte';

  const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';
  let serverUrl = $state(DEFAULT_WS_URL);
  let connecting = $state(false);

  const TONE_PRESETS = ['friendly', 'professional', 'casual', 'concise', 'verbose'] as const;
  let selectedTone = $state('');
  let customInstructions = $state('');
  let personalitySaving = $state(false);

  $effect(() => {
    if ($preferencesLoaded) {
      selectedTone = $preferences['personality_tone'] || '';
      customInstructions = $preferences['personality_instructions'] || '';
    }
  });

  let apiKeyInputs: Record<string, string> = $state({});

  let credentialsByService = $derived(
    ($credentials).reduce<Record<string, CredentialInfo[]>>((acc, cred) => {
      if (!acc[cred.service]) acc[cred.service] = [];
      acc[cred.service].push(cred);
      return acc;
    }, {})
  );

  onMount(() => { initCredentialHandlers(); initPreferencesHandlers(); });

  $effect(() => {
    if ($isConnected) { requestIntegrations(); requestCredentials(); requestPreferences(); }
  });

  async function handleConnect() {
    connecting = true;
    try { await connect(serverUrl); } catch {} finally { connecting = false; }
  }

  function handleOAuth(service: string, scopes: string[], account?: string) {
    initiateOAuth(service, scopes, account);
  }

  function handleConnectAnother(service: string, scopes: string[]) {
    const label = prompt('Account label (e.g., "personal", "work"):');
    if (label?.trim()) initiateOAuth(service, scopes, label.trim());
  }

  function handleApiKeySubmit(service: string, name: string) {
    const value = apiKeyInputs[service];
    if (!value?.trim()) return;
    setCredential(service, `${name} Bot Token`, 'api_key', value.trim());
    apiKeyInputs[service] = '';
  }

  function savePersonality() {
    personalitySaving = true;
    setPreference('personality_tone', selectedTone);
    setPreference('personality_instructions', customInstructions);
    setTimeout(() => { personalitySaving = false; }, 800);
  }
</script>

<div class="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-5">
  <h2 class="text-xl font-bold text-[var(--theme-text)]">Settings</h2>

  <Section title="Connection">
    <div class="space-y-4">
      <Input label="Agent CVM URL" bind:value={serverUrl} placeholder="ws://localhost:8080/ws" mono />
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Status</span>
        <Badge variant={$connectionState === 'encrypted' ? 'success' : 'neutral'}>{$connectionState}</Badge>
      </div>
      <div class="flex gap-2">
        {#if $connectionState === 'encrypted'}
          <Button variant="secondary" size="sm" onclick={disconnect}>
            <WifiOff size={14} /> Disconnect
          </Button>
        {:else}
          <Button variant="primary" size="sm" loading={connecting} onclick={handleConnect}>
            <Wifi size={14} /> Connect
          </Button>
        {/if}
      </div>
    </div>
  </Section>

  <Section title="Agent Personality">
    {#if !$isConnected}
      <p class="text-sm text-[var(--theme-text-muted)]">Connect to the Agent CVM to customize your agent's personality.</p>
    {:else}
      <div class="space-y-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Tone</span>
          <div class="flex flex-wrap gap-1.5">
            {#each TONE_PRESETS as tone}
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-full border capitalize transition-all
                  {selectedTone === tone
                    ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white'
                    : 'bg-[var(--theme-surface-hover)] border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface-active)]'}"
                onclick={() => { selectedTone = selectedTone === tone ? '' : tone; }}
              >
                {tone}
              </button>
            {/each}
          </div>
        </div>
        <Textarea label="Custom instructions" bind:value={customInstructions} placeholder="e.g., Always respond in Spanish, Use bullet points, Be sarcastic..." rows={3} />
        <Button variant="primary" size="sm" loading={personalitySaving} onclick={savePersonality}>
          {personalitySaving ? 'Saved!' : 'Save personality'}
        </Button>
      </div>
    {/if}
  </Section>

  <Section title="Integrations">
    {#if !$isConnected}
      <p class="text-sm text-[var(--theme-text-muted)] leading-relaxed">
        Connect to the Agent CVM to manage integrations. All credentials are stored encrypted inside the TEE — never on your device.
      </p>
    {:else if $integrations.length === 0}
      <p class="text-sm text-[var(--theme-text-muted)]">Loading integrations...</p>
    {:else}
      <div class="flex flex-col gap-3">
        {#each $integrations as integration}
          <IntegrationCard
            {integration}
            credentials={credentialsByService[integration.service] || []}
            oauthLoading={$oauthLoading === integration.service}
            apiKeyValue={apiKeyInputs[integration.service] || ''}
            onconnect={handleOAuth}
            ondisconnect={deleteCredential}
            onapikey={handleApiKeySubmit}
            onapikeyinput={(v) => { apiKeyInputs[integration.service] = v; }}
            onconnectanother={handleConnectAnother}
          />
        {/each}
      </div>
    {/if}
  </Section>

  <Section title="Notifications">
    <div class="flex items-center gap-3">
      <Bell size={16} class="text-[var(--theme-text-muted)]" />
      <span class="text-sm text-[var(--theme-text)]">{$notificationPermission}</span>
      {#if $notificationPermission === 'default'}
        <Button variant="secondary" size="sm" onclick={requestPermission}>Enable</Button>
      {/if}
    </div>
  </Section>
</div>
