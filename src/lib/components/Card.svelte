<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    hover?: boolean;
    active?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
  }

  let { hover = false, active = false, padding = 'md', children, header, footer }: Props = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
</script>

<div
  class="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]
    {hover ? 'transition-all duration-150 hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-lg)]' : ''}
    {active ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' : ''}"
>
  {#if header}
    <div class="px-4 py-3 border-b border-[var(--theme-border)]">
      {@render header()}
    </div>
  {/if}
  <div class={paddingClasses[padding]}>
    {@render children()}
  </div>
  {#if footer}
    <div class="px-4 py-3 border-t border-[var(--theme-border)]">
      {@render footer()}
    </div>
  {/if}
</div>
