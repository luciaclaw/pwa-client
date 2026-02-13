<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { connectionState, connect, isConnected } from '$lib/stores/websocket.js';
  import { subscribeToPush } from '$lib/stores/notifications.js';
  import { onboardingCompleted } from '$lib/stores/onboarding.js';
  import { effectiveTheme, applyTheme } from '$lib/stores/theme.js';
  import { Shield, Cpu, KeyRound, Lock, ShieldCheck } from '@lucide/svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import SecurityVerification from '$lib/components/SecurityVerification.svelte';
  import { MessageSquare, Clock, GitBranch, Brain, Settings, ShieldCheck as ShieldCheckNav, Menu, X } from '@lucide/svelte';

  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';

  let { children } = $props();
  let pushSubscribed = false;
  let showSecurityAnimation = $state(false);
  let mobileMenuOpen = $state(false);
  let prevConnectionState = $state('disconnected');

  const securitySteps = [
    { icon: Shield, label: 'Connecting to secure enclave...', detail: 'Intel TDX' },
    { icon: Cpu, label: 'Verifying Intel TDX attestation...', detail: 'Remote attestation' },
    { icon: KeyRound, label: 'Generating encryption keys...', detail: 'ECDH P-256' },
    { icon: Lock, label: 'Establishing E2E encrypted channel...', detail: 'AES-256-GCM' },
    { icon: ShieldCheck, label: 'Secure connection active', detail: 'Hardware-encrypted' },
  ];

  // Apply theme on mount
  onMount(() => {
    const unsub = effectiveTheme.subscribe((t) => applyTheme(t));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }

    return unsub;
  });

  // Redirect to onboarding if not completed
  $effect(() => {
    const onOnboard = page.url.pathname.startsWith('/onboard');
    if (!$onboardingCompleted && !onOnboard) {
      goto('/onboard');
    }
  });

  // Auto-connect
  $effect(() => {
    if ($onboardingCompleted && $connectionState === 'disconnected') {
      connect(WS_URL).catch(() => {});
    }
  });

  // Auto-subscribe to push
  $effect(() => {
    if ($isConnected && !pushSubscribed) {
      pushSubscribed = true;
      subscribeToPush().catch(() => {});
    }
  });

  // Trigger security animation on connection
  $effect(() => {
    if (prevConnectionState !== 'encrypted' && $connectionState === 'encrypted') {
      showSecurityAnimation = true;
    }
    prevConnectionState = $connectionState;
  });

  function getStatusType(state: string): 'connected' | 'connecting' | 'error' | 'disconnected' {
    if (state === 'encrypted') return 'connected';
    if (state === 'connecting' || state === 'handshaking') return 'connecting';
    if (state === 'error') return 'error';
    return 'disconnected';
  }
</script>

<SecurityVerification
  steps={securitySteps}
  active={showSecurityAnimation}
  onComplete={() => { showSecurityAnimation = false; }}
/>

<div class="flex flex-col h-screen bg-[var(--theme-bg)]">
  <header class="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/80 backdrop-blur-xl">
    <nav class="flex items-center px-4 py-2.5 gap-2 max-w-[1400px] mx-auto w-full">
      <a href="/" class="text-lg font-bold tracking-tight text-[var(--theme-primary)] mr-2 shrink-0">Lucia</a>

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-0.5 flex-1">
        <NavLink href="/chat" label="Chat" icon={MessageSquare} />
        <NavLink href="/schedules" label="Schedules" icon={Clock} />
        <NavLink href="/workflows" label="Workflows" icon={GitBranch} />
        <NavLink href="/memories" label="Memory" icon={Brain} />
        <NavLink href="/settings" label="Settings" icon={Settings} />
        <NavLink href="/trust" label="Trust" icon={ShieldCheckNav} />
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <StatusBadge status={getStatusType($connectionState)} />
        <ThemeToggle />

        <!-- Mobile hamburger -->
        <button
          class="md:hidden p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] transition-colors"
          onclick={() => mobileMenuOpen = !mobileMenuOpen}
        >
          {#if mobileMenuOpen}
            <X size={20} />
          {:else}
            <Menu size={20} />
          {/if}
        </button>
      </div>
    </nav>

    <!-- Mobile menu -->
    {#if mobileMenuOpen}
      <div class="md:hidden border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 flex flex-col gap-1 animate-slide-up">
        <a href="/chat" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <MessageSquare size={16} /> Chat
        </a>
        <a href="/schedules" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <Clock size={16} /> Schedules
        </a>
        <a href="/workflows" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <GitBranch size={16} /> Workflows
        </a>
        <a href="/memories" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <Brain size={16} /> Memory
        </a>
        <a href="/settings" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <Settings size={16} /> Settings
        </a>
        <a href="/trust" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]" onclick={() => mobileMenuOpen = false}>
          <ShieldCheckNav size={16} /> Trust
        </a>
      </div>
    {/if}
  </header>

  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
</div>
