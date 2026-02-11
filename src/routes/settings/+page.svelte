<script lang="ts">
  import { connectionState, connect, disconnect } from '$lib/stores/websocket.js';
  import { requestPermission, notificationPermission } from '$lib/stores/notifications.js';

  const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';
  let serverUrl = $state(DEFAULT_WS_URL);
  let connecting = $state(false);

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
    <h3>Notifications</h3>
    <div class="form-group">
      <label>Permission</label>
      <span>{$notificationPermission}</span>
    </div>
    {#if $notificationPermission === 'default'}
      <button class="btn" onclick={handleNotificationPermission}>Enable Notifications</button>
    {/if}
  </section>

  <section>
    <h3>Credentials</h3>
    <p class="placeholder-text">
      Credential management will be available when connected to a live Agent CVM.
      All credentials are stored encrypted inside the TEE — never on your device.
    </p>
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

  input[type="text"] {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    font-family: var(--font-mono);
  }

  input[type="text"]:focus {
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

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .placeholder-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
</style>
