<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<div class="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]">
  <div class="px-5 py-3.5 border-b border-[var(--theme-border)]">
    <h3 class="text-sm font-semibold text-[var(--theme-text)]">{title}</h3>
  </div>
  <div class="p-5">
    {@render children()}
  </div>
</div>
