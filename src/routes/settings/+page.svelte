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
  import { Bell, Wifi, WifiOff, User, Upload, X } from '@lucide/svelte';
  import Section from '$lib/components/Section.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import IntegrationCard from '$lib/components/IntegrationCard.svelte';

  const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://318943fa6292b8b45307ce52afb524a9f124de2b-8080.dstack-pha-prod9.phala.network/ws';
  let serverUrl = $state(DEFAULT_WS_URL);
  let connecting = $state(false);

  // Profile fields
  let userFullName = $state('');
  let userPreferredName = $state('');
  let userTimezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
  let profileSaving = $state(false);

  // Agent identity fields
  let agentName = $state('Lucia');
  let agentAvatar = $state('');
  let agentIdentitySaving = $state(false);
  let avatarFileInput = $state<HTMLInputElement>();

  const TONE_PRESETS = ['friendly', 'professional', 'casual', 'concise', 'verbose'] as const;
  let selectedTone = $state('');
  let customInstructions = $state('');
  let personalitySaving = $state(false);

  const timezones = Intl.supportedValuesOf('timeZone');

  $effect(() => {
    if ($preferencesLoaded) {
      selectedTone = $preferences['personality_tone'] || '';
      customInstructions = $preferences['personality_instructions'] || '';
      userFullName = $preferences['user_full_name'] || '';
      userPreferredName = $preferences['user_preferred_name'] || '';
      userTimezone = $preferences['user_timezone'] || Intl.DateTimeFormat().resolvedOptions().timeZone;
      agentName = $preferences['agent_name'] || 'Lucia';
      agentAvatar = $preferences['agent_avatar'] || '';
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

  function saveProfile() {
    profileSaving = true;
    setPreference('user_full_name', userFullName);
    setPreference('user_preferred_name', userPreferredName);
    setPreference('user_timezone', userTimezone);
    setTimeout(() => { profileSaving = false; }, 800);
  }

  function savePersonality() {
    personalitySaving = true;
    setPreference('personality_tone', selectedTone);
    setPreference('personality_instructions', customInstructions);
    setTimeout(() => { personalitySaving = false; }, 800);
  }

  function saveAgentIdentity() {
    agentIdentitySaving = true;
    setPreference('agent_name', agentName);
    setPreference('agent_avatar', agentAvatar);
    setTimeout(() => { agentIdentitySaving = false; }, 800);
  }

  function handleAvatarUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 256 * 1024) {
      alert('Image must be under 256KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { agentAvatar = reader.result as string; };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    agentAvatar = '';
    if (avatarFileInput) avatarFileInput.value = '';
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

  <Section title="Profile">
    {#if !$isConnected}
      <p class="text-sm text-[var(--theme-text-muted)]">Connect to the Agent CVM to manage your profile.</p>
    {:else}
      <div class="space-y-4">
        <Input label="Full name" bind:value={userFullName} placeholder="Your full name" />
        <Input label="Preferred name" bind:value={userPreferredName} placeholder="How should the agent address you?" />
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]" for="tz-select">Timezone</label>
          <select
            id="tz-select"
            bind:value={userTimezone}
            class="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            {#each timezones as tz}
              <option value={tz}>{tz.replace(/_/g, ' ')}</option>
            {/each}
          </select>
        </div>
        <Button variant="primary" size="sm" loading={profileSaving} onclick={saveProfile}>
          {profileSaving ? 'Saved!' : 'Save profile'}
        </Button>
      </div>
    {/if}
  </Section>

  <Section title="Agent Identity">
    {#if !$isConnected}
      <p class="text-sm text-[var(--theme-text-muted)]">Connect to the Agent CVM to customize your agent's identity.</p>
    {:else}
      <div class="space-y-4">
        <Input label="Agent name" bind:value={agentName} placeholder="Lucia" />
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Profile picture</span>
          <div class="flex items-center gap-3">
            {#if agentAvatar}
              <div class="relative">
                <img src={agentAvatar} alt="Agent avatar" class="w-14 h-14 rounded-full object-cover border-2 border-[var(--theme-border)]" />
                <button
                  class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--theme-error)] text-white flex items-center justify-center"
                  onclick={removeAvatar}
                  aria-label="Remove avatar"
                >
                  <X size={12} />
                </button>
              </div>
            {:else}
              <div class="w-14 h-14 rounded-full bg-[var(--theme-surface-hover)] border-2 border-dashed border-[var(--theme-border)] flex items-center justify-center">
                <User size={20} class="text-[var(--theme-text-muted)]" />
              </div>
            {/if}
            <div>
              <button
                class="text-xs font-medium text-[var(--theme-primary)] hover:underline"
                onclick={() => avatarFileInput?.click()}
              >
                <Upload size={12} class="inline mr-1" />
                {agentAvatar ? 'Change image' : 'Upload image'}
              </button>
              <p class="text-[0.65rem] text-[var(--theme-text-muted)] mt-0.5">Max 256KB, image files only</p>
              <input
                bind:this={avatarFileInput}
                type="file"
                accept="image/*"
                class="hidden"
                onchange={handleAvatarUpload}
              />
            </div>
          </div>
        </div>
        <Button variant="primary" size="sm" loading={agentIdentitySaving} onclick={saveAgentIdentity}>
          {agentIdentitySaving ? 'Saved!' : 'Save agent identity'}
        </Button>
      </div>
    {/if}
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
                class="px-3 py-1.5 text-xs rounded-full border capitalize transition-all
                  {selectedTone === tone
                    ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white font-semibold ring-2 ring-[var(--theme-primary)] ring-offset-1 ring-offset-[var(--theme-bg)] scale-105'
                    : 'bg-[var(--theme-surface-hover)] border-[var(--theme-border)] text-[var(--theme-text)] font-medium hover:bg-[var(--theme-surface-active)]'}"
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
