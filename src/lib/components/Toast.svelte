<script lang="ts">
  import { X } from '@lucide/svelte';

  interface Props {
    message: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
    visible?: boolean;
    onclose?: () => void;
  }

  let { message, variant = 'info', visible = true, onclose }: Props = $props();

  const variantClasses = {
    success: 'border-[var(--theme-success)] bg-[var(--theme-success-muted)] text-[var(--theme-success)]',
    error: 'border-[var(--theme-error)] bg-[var(--theme-error-muted)] text-[var(--theme-error)]',
    info: 'border-[var(--theme-primary)] bg-[var(--theme-primary-muted)] text-[var(--theme-primary)]',
    warning: 'border-[var(--theme-warning)] bg-[var(--theme-warning-muted)] text-[var(--theme-warning)]',
  };
</script>

{#if visible}
  <div class="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm animate-slide-up {variantClasses[variant]}">
    <span class="flex-1">{message}</span>
    {#if onclose}
      <button class="p-0.5 rounded hover:opacity-70 transition-opacity" onclick={onclose}>
        <X size={14} />
      </button>
    {/if}
  </div>
{/if}
