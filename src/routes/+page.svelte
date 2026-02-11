<script lang="ts">
  import { connectionState } from '$lib/stores/websocket.js';
</script>

<div class="landing">
  <div class="hero">
    <h1>Lucia</h1>
    <p class="subtitle">Privacy-preserving AI agent</p>
    <p class="description">
      Your conversations and credentials are hardware-encrypted inside a Trusted Execution Environment.
      Not even the platform operator can access your data.
    </p>

    <div class="actions">
      <a href="/chat" class="btn btn-primary">Open Chat</a>
      <a href="/trust" class="btn btn-secondary">Verify Trust</a>
    </div>
  </div>

  <div class="features">
    <div class="feature">
      <h3>E2E Encrypted</h3>
      <p>All communication encrypted with ECDH + AES-256-GCM. Keys never leave your device.</p>
    </div>
    <div class="feature">
      <h3>TEE Protected</h3>
      <p>Agent runs inside Intel TDX hardware enclave. Memory and storage encrypted by CPU.</p>
    </div>
    <div class="feature">
      <h3>Verifiable</h3>
      <p>Cryptographic attestation proves the agent is genuine. Verify at any time.</p>
    </div>
  </div>
</div>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    min-height: 100%;
  }

  .hero {
    text-align: center;
    max-width: 600px;
  }

  h1 {
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
  }

  .description {
    color: var(--color-text-muted);
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background: var(--color-surface-hover);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 4rem;
    max-width: 800px;
    width: 100%;
  }

  .feature {
    padding: 1.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .feature h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .feature p {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
</style>
