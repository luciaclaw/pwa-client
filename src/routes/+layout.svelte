<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { connectionState, connect, isConnected } from '$lib/stores/websocket.js';
  import { subscribeToPush } from '$lib/stores/notifications.js';

  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';

  let { children } = $props();
  let pushSubscribed = false;

  onMount(() => {
    // Auto-connect to CVM
    connect(WS_URL).catch(() => {});

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // Service worker registration failed — non-critical
      });
    }
  });

  // Auto-subscribe to push after E2E connection established
  $effect(() => {
    if ($isConnected && !pushSubscribed) {
      pushSubscribed = true;
      subscribeToPush().catch(() => {});
    }
  });
</script>

<div class="app">
  <header>
    <nav>
      <a href="/" class="logo">Lucia</a>
      <div class="nav-links">
        <a href="/chat">Chat</a>
        <a href="/schedules">Schedules</a>
        <a href="/memories">Memory</a>
        <a href="/settings">Settings</a>
        <a href="/trust">Trust</a>
      </div>
      <div class="connection-status" class:connected={$connectionState === 'encrypted'} class:connecting={$connectionState === 'handshaking' || $connectionState === 'connecting'} class:error={$connectionState === 'error'}>
        {#if $connectionState === 'encrypted'}
          E2E Encrypted
        {:else if $connectionState === 'handshaking' || $connectionState === 'connecting'}
          Connecting...
        {:else if $connectionState === 'error'}
          Connection Error
        {:else}
          Disconnected
        {/if}
      </div>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  header {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  nav {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    letter-spacing: -0.025em;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
    margin-left: auto;
  }

  .nav-links a {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    transition: color 0.15s;
  }

  .nav-links a:hover {
    color: var(--color-text);
  }

  .connection-status {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
  }

  .connection-status.connected {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-success);
  }

  .connection-status.connecting {
    background: rgba(245, 158, 11, 0.15);
    color: var(--color-warning);
  }

  .connection-status.error {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-error);
  }

  main {
    flex: 1;
    overflow: hidden;
  }
</style>
