<script lang="ts">
  import { connectionState } from '$lib/stores/websocket.js';
  import { Shield, Cpu, Eye } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
</script>

<div class="flex flex-col items-center justify-center px-6 py-12 min-h-full">
  <div class="text-center max-w-xl">
    <h1 class="text-5xl font-extrabold tracking-tight mb-2">
      <span class="bg-gradient-to-r from-[var(--theme-primary)] to-purple-400 bg-clip-text text-transparent">Lucia</span>
    </h1>
    <p class="text-lg text-[var(--theme-text-muted)] mb-4">Privacy-preserving AI agent</p>
    <p class="text-sm text-[var(--theme-text-muted)] leading-relaxed mb-8">
      Your conversations and credentials are hardware-encrypted inside a Trusted Execution Environment.
      Not even the platform operator can access your data.
    </p>

    <div class="flex gap-3 justify-center">
      <a href="/chat">
        <Button variant="primary" size="lg">Open Chat</Button>
      </a>
      <a href="/trust">
        <Button variant="outline" size="lg">Verify Trust</Button>
      </a>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
    <div class="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-center hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-lg)] transition-all duration-150">
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-primary-muted)] text-[var(--theme-primary)] mb-3">
        <Shield size={20} />
      </div>
      <h3 class="text-sm font-semibold mb-1 text-[var(--theme-text)]">E2E Encrypted</h3>
      <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">All communication encrypted with ECDH + AES-256-GCM. Keys never leave your device.</p>
    </div>

    <div class="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-center hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-lg)] transition-all duration-150">
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-success-muted)] text-[var(--theme-success)] mb-3">
        <Cpu size={20} />
      </div>
      <h3 class="text-sm font-semibold mb-1 text-[var(--theme-text)]">TEE Protected</h3>
      <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Agent runs inside Intel TDX hardware enclave. Memory and storage encrypted by CPU.</p>
    </div>

    <div class="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-center hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-lg)] transition-all duration-150">
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--theme-info-muted)] text-[var(--theme-info)] mb-3">
        <Eye size={20} />
      </div>
      <h3 class="text-sm font-semibold mb-1 text-[var(--theme-text)]">Verifiable</h3>
      <p class="text-xs text-[var(--theme-text-muted)] leading-relaxed">Cryptographic attestation proves the agent is genuine. Verify at any time.</p>
    </div>
  </div>
</div>
