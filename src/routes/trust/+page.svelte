<script lang="ts">
  import { connectionState } from '$lib/stores/websocket.js';
  import { ShieldCheck, CircleDashed, Cpu, Fingerprint, Lock } from '@lucide/svelte';
  import Section from '$lib/components/Section.svelte';
  import Badge from '$lib/components/Badge.svelte';
</script>

<div class="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-5">
  <h2 class="text-xl font-bold text-[var(--theme-text)]">Trust Dashboard</h2>

  <Section title="TEE Attestation">
    {#if $connectionState === 'encrypted'}
      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-success-muted)] border border-[var(--theme-success)]/30">
        <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--theme-success-muted)] text-[var(--theme-success)] flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p class="text-sm font-semibold text-[var(--theme-text)]">Connection Verified</p>
          <p class="text-xs text-[var(--theme-text-muted)]">E2E encrypted channel established with agent CVM.</p>
        </div>
      </div>
    {:else}
      <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-surface-hover)] border border-[var(--theme-border)]">
        <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)] flex items-center justify-center">
          <CircleDashed size={20} />
        </div>
        <div>
          <p class="text-sm font-semibold text-[var(--theme-text)]">Not Connected</p>
          <p class="text-xs text-[var(--theme-text-muted)]">Connect to an agent CVM to verify its attestation report.</p>
        </div>
      </div>
    {/if}
  </Section>

  <Section title="What This Means">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Cpu size={16} class="text-[var(--theme-primary)]" />
          <h4 class="text-sm font-semibold text-[var(--theme-primary)]">Intel TDX</h4>
        </div>
        <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Your agent runs inside a hardware-encrypted virtual machine. The CPU encrypts all memory — even the cloud provider cannot read it.</p>
      </div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Fingerprint size={16} class="text-[var(--theme-primary)]" />
          <h4 class="text-sm font-semibold text-[var(--theme-primary)]">Remote Attestation</h4>
        </div>
        <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">A cryptographic proof from Intel confirms the agent code hasn't been tampered with. This report is verified during connection.</p>
      </div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Lock size={16} class="text-[var(--theme-primary)]" />
          <h4 class="text-sm font-semibold text-[var(--theme-primary)]">E2E Encryption</h4>
        </div>
        <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Your messages are encrypted in your browser before transmission. Only the agent inside the TEE can decrypt them.</p>
      </div>
    </div>
  </Section>

  <Section title="Attestation Report">
    <p class="text-sm text-[var(--theme-text-muted)] leading-relaxed">
      Detailed attestation report with TDX measurements, CVM image hash,
      and verification links will be available when connected to a production CVM on Phala Cloud.
    </p>
  </Section>
</div>
