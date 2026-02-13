<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';

  interface Props {
    open: boolean;
    title?: string;
    onclose: () => void;
    children: Snippet;
  }

  let { open, title, onclose, children }: Props = $props();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-overlay)] backdrop-blur-sm animate-fade-in"
    onclick={handleBackdrop}
    onkeydown={handleKeydown}
  >
    <div class="w-full max-w-lg mx-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-[var(--theme-shadow-lg)] animate-slide-up">
      {#if title}
        <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border)]">
          <h3 class="text-base font-semibold text-[var(--theme-text)]">{title}</h3>
          <button
            class="p-1 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] transition-colors"
            onclick={onclose}
          >
            <X size={18} />
          </button>
        </div>
      {/if}
      <div class="p-5">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
