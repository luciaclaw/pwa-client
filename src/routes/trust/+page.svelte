<script lang="ts">
  import { connectionState } from '$lib/stores/websocket.js';
</script>

<div class="trust">
  <h2>Trust Dashboard</h2>

  <section>
    <h3>TEE Attestation</h3>
    {#if $connectionState === 'encrypted'}
      <div class="attestation-status verified">
        <span class="icon">&#x2713;</span>
        <div>
          <p class="label">Connection Verified</p>
          <p class="detail">E2E encrypted channel established with agent CVM.</p>
        </div>
      </div>
    {:else}
      <div class="attestation-status pending">
        <span class="icon">&#x25CB;</span>
        <div>
          <p class="label">Not Connected</p>
          <p class="detail">Connect to an agent CVM to verify its attestation report.</p>
        </div>
      </div>
    {/if}
  </section>

  <section>
    <h3>What This Means</h3>
    <div class="info-grid">
      <div class="info-item">
        <h4>Intel TDX</h4>
        <p>Your agent runs inside a hardware-encrypted virtual machine. The CPU encrypts all memory — even the cloud provider cannot read it.</p>
      </div>
      <div class="info-item">
        <h4>Remote Attestation</h4>
        <p>A cryptographic proof from Intel confirms the agent code hasn't been tampered with. This report is verified during connection.</p>
      </div>
      <div class="info-item">
        <h4>E2E Encryption</h4>
        <p>Your messages are encrypted in your browser before transmission. Only the agent inside the TEE can decrypt them.</p>
      </div>
    </div>
  </section>

  <section>
    <h3>Attestation Report</h3>
    <p class="placeholder-text">
      Detailed attestation report with TDX measurements, CVM image hash,
      and verification links will be available when connected to a production CVM on Phala Cloud.
    </p>
  </section>
</div>

<style>
  .trust {
    max-width: 700px;
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

  .attestation-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: var(--radius);
  }

  .attestation-status.verified {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .attestation-status.pending {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .icon {
    font-size: 1.5rem;
  }

  .verified .icon {
    color: var(--color-success);
  }

  .label {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .detail {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .info-item h4 {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: var(--color-primary);
  }

  .info-item p {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .placeholder-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
</style>
