<script lang="ts">
  interface Props {
    status: 'connected' | 'connecting' | 'error' | 'disconnected';
    label?: string;
  }

  let { status, label }: Props = $props();

  const statusConfig = {
    connected: { color: 'bg-[var(--theme-success)]', bgColor: 'bg-[var(--theme-success-muted)]', textColor: 'text-[var(--theme-success)]', defaultLabel: 'E2E Encrypted' },
    connecting: { color: 'bg-[var(--theme-warning)]', bgColor: 'bg-[var(--theme-warning-muted)]', textColor: 'text-[var(--theme-warning)]', defaultLabel: 'Connecting...' },
    error: { color: 'bg-[var(--theme-error)]', bgColor: 'bg-[var(--theme-error-muted)]', textColor: 'text-[var(--theme-error)]', defaultLabel: 'Connection Error' },
    disconnected: { color: 'bg-[var(--theme-text-muted)]', bgColor: 'bg-[var(--theme-surface-hover)]', textColor: 'text-[var(--theme-text-muted)]', defaultLabel: 'Disconnected' },
  };

  const config = $derived(statusConfig[status]);
</script>

<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-semibold {config.bgColor} {config.textColor}">
  <span class="relative flex h-2 w-2">
    {#if status === 'connected' || status === 'connecting'}
      <span class="absolute inline-flex h-full w-full rounded-full {config.color} opacity-75 animate-ping"></span>
    {/if}
    <span class="relative inline-flex h-2 w-2 rounded-full {config.color}"></span>
  </span>
  {label || config.defaultLabel}
</div>
