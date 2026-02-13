<script lang="ts">
  import { connectionState, connect, disconnect, isConnected } from '$lib/stores/websocket.js';
  import { wsUrl, setWsUrl } from '$lib/stores/connection.js';
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
  import { Bell, Wifi, WifiOff, User, Upload, X, Server } from '@lucide/svelte';
  import Section from '$lib/components/Section.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import IntegrationCard from '$lib/components/IntegrationCard.svelte';

  let serverUrl = $state($wsUrl);
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

  // CVM Configuration fields
  let llmApiKey = $state('');
  let llmBackendUrl = $state('');
  let llmModelName = $state('');
  let llmSaving = $state(false);

  let braveSearchKey = $state('');
  let braveSaving = $state(false);

  let googleClientId = $state('');
  let googleClientSecret = $state('');
  let googleOAuthSaving = $state(false);

  let slackClientId = $state('');
  let slackClientSecret = $state('');
  let slackOAuthSaving = $state(false);

  let githubClientId = $state('');
  let githubClientSecret = $state('');
  let githubOAuthSaving = $state(false);

  /** Set of config service names that have been stored in the vault */
  let configCredentials = $derived(
    new Set(($credentials).filter(c =>
      ['llm_backend', 'brave_search', 'google_oauth_config', 'slack_oauth_config', 'github_oauth_config'].includes(c.service)
    ).map(c => c.service))
  );

  function saveLlmConfig() {
    if (!llmApiKey.trim()) return;
    llmSaving = true;
    const value = JSON.stringify({
      apiKey: llmApiKey.trim(),
      ...(llmBackendUrl.trim() ? { backendUrl: llmBackendUrl.trim() } : {}),
      ...(llmModelName.trim() ? { modelName: llmModelName.trim() } : {}),
    });
    setCredential('llm_backend', 'LLM Backend', 'api_key', value);
    llmApiKey = '';
    llmBackendUrl = '';
    llmModelName = '';
    setTimeout(() => { llmSaving = false; }, 800);
  }

  function saveBraveConfig() {
    if (!braveSearchKey.trim()) return;
    braveSaving = true;
    setCredential('brave_search', 'Brave Search API', 'api_key', braveSearchKey.trim());
    braveSearchKey = '';
    setTimeout(() => { braveSaving = false; }, 800);
  }

  function saveGoogleOAuthConfig() {
    if (!googleClientId.trim() || !googleClientSecret.trim()) return;
    googleOAuthSaving = true;
    const value = JSON.stringify({ clientId: googleClientId.trim(), clientSecret: googleClientSecret.trim() });
    setCredential('google_oauth_config', 'Google OAuth Config', 'api_key', value);
    googleClientId = '';
    googleClientSecret = '';
    setTimeout(() => { googleOAuthSaving = false; }, 800);
  }

  function saveSlackOAuthConfig() {
    if (!slackClientId.trim() || !slackClientSecret.trim()) return;
    slackOAuthSaving = true;
    const value = JSON.stringify({ clientId: slackClientId.trim(), clientSecret: slackClientSecret.trim() });
    setCredential('slack_oauth_config', 'Slack OAuth Config', 'api_key', value);
    slackClientId = '';
    slackClientSecret = '';
    setTimeout(() => { slackOAuthSaving = false; }, 800);
  }

  function saveGithubOAuthConfig() {
    if (!githubClientId.trim() || !githubClientSecret.trim()) return;
    githubOAuthSaving = true;
    const value = JSON.stringify({ clientId: githubClientId.trim(), clientSecret: githubClientSecret.trim() });
    setCredential('github_oauth_config', 'GitHub OAuth Config', 'api_key', value);
    githubClientId = '';
    githubClientSecret = '';
    setTimeout(() => { githubOAuthSaving = false; }, 800);
  }

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
    setWsUrl(serverUrl);
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

  <Section title="CVM Configuration">
    {#if !$isConnected}
      <p class="text-sm text-[var(--theme-text-muted)]">Connect to the Agent CVM to configure infrastructure credentials.</p>
    {:else}
      <p class="text-xs text-[var(--theme-text-muted)] mb-4">
        Configure API keys and OAuth credentials for your CVM. Values are stored encrypted in the vault and override environment variables.
      </p>
      <div class="space-y-5">

        <!-- LLM Backend -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text)]">LLM Backend</span>
            {#if configCredentials.has('llm_backend')}
              <Badge variant="success">Configured</Badge>
            {/if}
          </div>
          <p class="text-[0.7rem] text-[var(--theme-text-muted)]">API key for your LLM inference provider. Optionally override the backend URL and model.</p>
          <Input label="API Key" type="password" bind:value={llmApiKey} placeholder="sk-..." mono />
          <Input label="Backend URL (optional)" bind:value={llmBackendUrl} placeholder="https://api.redpill.ai/v1" mono />
          <Input label="Model name (optional)" bind:value={llmModelName} placeholder="deepseek/deepseek-chat-v3-0324" mono />
          <Button variant="primary" size="sm" loading={llmSaving} onclick={saveLlmConfig}>
            {llmSaving ? 'Saved!' : 'Save LLM config'}
          </Button>
        </div>

        <hr class="border-[var(--theme-border)]" />

        <!-- Brave Search -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text)]">Brave Search</span>
            {#if configCredentials.has('brave_search')}
              <Badge variant="success">Configured</Badge>
            {/if}
          </div>
          <p class="text-[0.7rem] text-[var(--theme-text-muted)]">API key for Brave Search. Required for the web.search tool.</p>
          <Input label="API Key" type="password" bind:value={braveSearchKey} placeholder="BSA..." mono />
          <Button variant="primary" size="sm" loading={braveSaving} onclick={saveBraveConfig}>
            {braveSaving ? 'Saved!' : 'Save Brave key'}
          </Button>
        </div>

        <hr class="border-[var(--theme-border)]" />

        <!-- Google OAuth -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text)]">Google OAuth</span>
            {#if configCredentials.has('google_oauth_config')}
              <Badge variant="success">Configured</Badge>
            {/if}
          </div>
          <p class="text-[0.7rem] text-[var(--theme-text-muted)]">Client credentials for Google OAuth (Gmail, Calendar). Create at console.cloud.google.com.</p>
          <Input label="Client ID" bind:value={googleClientId} placeholder="123456789.apps.googleusercontent.com" mono />
          <Input label="Client Secret" type="password" bind:value={googleClientSecret} placeholder="GOCSPX-..." mono />
          <Button variant="primary" size="sm" loading={googleOAuthSaving} onclick={saveGoogleOAuthConfig}>
            {googleOAuthSaving ? 'Saved!' : 'Save Google OAuth'}
          </Button>
        </div>

        <hr class="border-[var(--theme-border)]" />

        <!-- Slack OAuth -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text)]">Slack OAuth</span>
            {#if configCredentials.has('slack_oauth_config')}
              <Badge variant="success">Configured</Badge>
            {/if}
          </div>
          <p class="text-[0.7rem] text-[var(--theme-text-muted)]">Client credentials for Slack integration. Create at api.slack.com/apps.</p>
          <Input label="Client ID" bind:value={slackClientId} placeholder="Slack Client ID" mono />
          <Input label="Client Secret" type="password" bind:value={slackClientSecret} placeholder="Slack Client Secret" mono />
          <Button variant="primary" size="sm" loading={slackOAuthSaving} onclick={saveSlackOAuthConfig}>
            {slackOAuthSaving ? 'Saved!' : 'Save Slack OAuth'}
          </Button>
        </div>

        <hr class="border-[var(--theme-border)]" />

        <!-- GitHub OAuth -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text)]">GitHub OAuth</span>
            {#if configCredentials.has('github_oauth_config')}
              <Badge variant="success">Configured</Badge>
            {/if}
          </div>
          <p class="text-[0.7rem] text-[var(--theme-text-muted)]">Client credentials for GitHub integration. Create at github.com/settings/developers.</p>
          <Input label="Client ID" bind:value={githubClientId} placeholder="Iv1.abc123..." mono />
          <Input label="Client Secret" type="password" bind:value={githubClientSecret} placeholder="GitHub Client Secret" mono />
          <Button variant="primary" size="sm" loading={githubOAuthSaving} onclick={saveGithubOAuthConfig}>
            {githubOAuthSaving ? 'Saved!' : 'Save GitHub OAuth'}
          </Button>
        </div>

      </div>
    {/if}
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
