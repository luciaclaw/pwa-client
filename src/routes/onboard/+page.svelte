<script lang="ts">
  import { goto } from '$app/navigation';
  import { connectionState, connect, isConnected } from '$lib/stores/websocket.js';
  import {
    integrations, credentials, oauthLoading,
    requestIntegrations, requestCredentials, initiateOAuth, setCredential, initCredentialHandlers,
  } from '$lib/stores/credentials.js';
  import {
    preferences, preferencesLoaded, requestPreferences, setPreference, initPreferencesHandlers,
  } from '$lib/stores/preferences.js';
  import {
    currentStep, stepIndex, totalSteps, allSteps,
    nextStep, prevStep, skipStep, completeOnboarding, onboardingCompleted,
  } from '$lib/stores/onboarding.js';
  import { onMount } from 'svelte';
  import { Lock, Zap, Clock, CheckCircle, MessageSquare, CalendarDays, GitBranch } from '@lucide/svelte';
  import ProgressStepper from '$lib/components/ProgressStepper.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import IntegrationCard from '$lib/components/IntegrationCard.svelte';

  const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';
  let serverUrl = $state(DEFAULT_WS_URL);
  let connecting = $state(false);
  let connectError = $state('');

  const TONE_PRESETS = ['friendly', 'professional', 'casual', 'concise', 'verbose'] as const;
  let selectedTone = $state('friendly');
  let customInstructions = $state('');
  let apiKeyInputs: Record<string, string> = $state({});

  $effect(() => {
    if ($preferencesLoaded) {
      if ($preferences['personality_tone']) selectedTone = $preferences['personality_tone'];
      if ($preferences['personality_instructions']) customInstructions = $preferences['personality_instructions'];
    }
  });

  onMount(() => {
    initCredentialHandlers();
    initPreferencesHandlers();
    const unsub = onboardingCompleted.subscribe((v) => { if (v) goto('/chat'); });
    return unsub;
  });

  $effect(() => {
    if ($isConnected) { requestIntegrations(); requestCredentials(); requestPreferences(); }
  });

  async function handleConnect() {
    connecting = true; connectError = '';
    try { await connect(serverUrl); } catch (e: any) { connectError = e?.message || 'Connection failed'; }
    finally { connecting = false; }
  }

  function handleSavePersonality() {
    setPreference('personality_tone', selectedTone);
    if (customInstructions.trim()) setPreference('personality_instructions', customInstructions.trim());
    nextStep();
  }

  function handleOAuth(service: string, scopes: string[]) { initiateOAuth(service, scopes); }

  function handleApiKeySubmit(service: string, name: string) {
    const value = apiKeyInputs[service];
    if (!value?.trim()) return;
    setCredential(service, `${name} Bot Token`, 'api_key', value.trim());
    apiKeyInputs[service] = '';
  }

  function handleFinish() { completeOnboarding(); goto('/chat'); }

  const STEP_LABELS: Record<string, string> = {
    welcome: 'Welcome', connect: 'Connect', personality: 'Personality', integrations: 'Integrations', complete: 'Ready',
  };
</script>

<div class="flex flex-col items-center min-h-full px-4 md:px-6 py-8">
  <ProgressStepper steps={allSteps.map(s => STEP_LABELS[s])} currentIndex={$stepIndex} />

  <div class="w-full max-w-xl animate-slide-up">
    <!-- Step 1: Welcome -->
    {#if $currentStep === 'welcome'}
      <div class="text-center">
        <h1 class="text-4xl font-extrabold tracking-tight mb-2">
          <span class="bg-gradient-to-r from-[var(--theme-primary)] to-purple-400 bg-clip-text text-transparent">Welcome to Lucia</span>
        </h1>
        <p class="text-base text-[var(--theme-text-muted)] mb-8">Your privacy-preserving AI agent</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-primary-muted)] text-[var(--theme-primary)] mb-2">
              <Lock size={20} />
            </div>
            <h3 class="text-sm font-semibold mb-1">Hardware-Encrypted</h3>
            <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Your data runs inside a Trusted Execution Environment. Not even the platform operator can access it.</p>
          </div>
          <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-success-muted)] text-[var(--theme-success)] mb-2">
              <Zap size={20} />
            </div>
            <h3 class="text-sm font-semibold mb-1">Multi-Platform</h3>
            <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Connect email, messaging, calendars, and more. Lucia works across all your services.</p>
          </div>
          <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-warning-muted)] text-[var(--theme-warning)] mb-2">
              <Clock size={20} />
            </div>
            <h3 class="text-sm font-semibold mb-1">Always Working</h3>
            <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Schedule tasks, automate workflows, and get briefings — even when you're not around.</p>
          </div>
        </div>
        <Button variant="primary" size="lg" onclick={nextStep}>Get Started</Button>
      </div>

    <!-- Step 2: Connect -->
    {:else if $currentStep === 'connect'}
      <div>
        <h2 class="text-xl font-bold mb-1">Connect to Your Agent</h2>
        <p class="text-sm text-[var(--theme-text-muted)] mb-5">Lucia runs inside a secure server (CVM). Enter your server URL below or use the default.</p>
        <div class="space-y-4">
          <Input label="Server URL" bind:value={serverUrl} placeholder="wss://your-cvm-url/ws" mono />
          {#if connectError}
            <div class="px-3 py-2 text-sm rounded-lg bg-[var(--theme-error-muted)] text-[var(--theme-error)]">{connectError}</div>
          {/if}
          {#if $connectionState === 'encrypted'}
            <div class="px-3 py-2 text-sm rounded-lg bg-[var(--theme-success-muted)] text-[var(--theme-success)]">Connected securely with E2E encryption</div>
          {/if}
          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onclick={prevStep}>Back</Button>
            {#if $connectionState === 'encrypted'}
              <Button variant="primary" size="sm" onclick={nextStep}>Continue</Button>
            {:else}
              <Button variant="primary" size="sm" loading={connecting || $connectionState === 'connecting' || $connectionState === 'handshaking'} disabled={!serverUrl.trim()} onclick={handleConnect}>Connect</Button>
            {/if}
          </div>
        </div>
      </div>

    <!-- Step 3: Personality -->
    {:else if $currentStep === 'personality'}
      <div>
        <h2 class="text-xl font-bold mb-1">Customize Your Agent</h2>
        <p class="text-sm text-[var(--theme-text-muted)] mb-5">Choose how Lucia communicates with you. You can change this anytime in Settings.</p>
        <div class="space-y-4">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Communication tone</span>
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
          <Textarea label="Custom instructions (optional)" bind:value={customInstructions} placeholder="e.g., Always respond in Spanish, Use bullet points, Call me by my first name..." rows={3} />
          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onclick={prevStep}>Back</Button>
            <Button variant="ghost" size="sm" onclick={skipStep}>Skip</Button>
            <Button variant="primary" size="sm" onclick={handleSavePersonality}>Save & Continue</Button>
          </div>
        </div>
      </div>

    <!-- Step 4: Integrations -->
    {:else if $currentStep === 'integrations'}
      <div>
        <h2 class="text-xl font-bold mb-1">Connect Your Services</h2>
        <p class="text-sm text-[var(--theme-text-muted)] mb-5">Connect the services you want Lucia to work with. All credentials are stored encrypted inside the TEE.</p>
        {#if $integrations.length === 0}
          <p class="text-sm text-[var(--theme-text-muted)] text-center py-6">Loading available integrations...</p>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {#each $integrations as integration}
              <IntegrationCard
                {integration}
                compact
                oauthLoading={$oauthLoading === integration.service}
                apiKeyValue={apiKeyInputs[integration.service] || ''}
                onconnect={(s, scopes) => handleOAuth(s, scopes)}
                onapikey={handleApiKeySubmit}
                onapikeyinput={(v) => { apiKeyInputs[integration.service] = v; }}
              />
            {/each}
          </div>
        {/if}
        <div class="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onclick={prevStep}>Back</Button>
          <Button variant="ghost" size="sm" onclick={skipStep}>Skip for now</Button>
          <Button variant="primary" size="sm" onclick={nextStep}>Continue</Button>
        </div>
      </div>

    <!-- Step 5: Complete -->
    {:else if $currentStep === 'complete'}
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--theme-success-muted)] text-[var(--theme-success)] mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 class="text-xl font-bold mb-1">You're All Set!</h2>
        <p class="text-sm text-[var(--theme-text-muted)] mb-6">Lucia is ready to help you. Start a conversation, set up scheduled tasks, or build automated workflows.</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div class="p-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left">
            <div class="flex items-center gap-2 mb-1">
              <MessageSquare size={14} class="text-[var(--theme-primary)]" />
              <h4 class="text-sm font-semibold">Chat</h4>
            </div>
            <p class="text-xs text-[var(--theme-text-muted)]">Start a conversation with your agent</p>
          </div>
          <div class="p-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left">
            <div class="flex items-center gap-2 mb-1">
              <CalendarDays size={14} class="text-[var(--theme-primary)]" />
              <h4 class="text-sm font-semibold">Schedules</h4>
            </div>
            <p class="text-xs text-[var(--theme-text-muted)]">Set up morning briefings and recurring tasks</p>
          </div>
          <div class="p-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left">
            <div class="flex items-center gap-2 mb-1">
              <GitBranch size={14} class="text-[var(--theme-primary)]" />
              <h4 class="text-sm font-semibold">Workflows</h4>
            </div>
            <p class="text-xs text-[var(--theme-text-muted)]">Build multi-step automated pipelines</p>
          </div>
        </div>
        <Button variant="primary" size="lg" onclick={handleFinish}>Open Chat</Button>
      </div>
    {/if}
  </div>
</div>
