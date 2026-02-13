<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    badge?: Snippet;
    children?: Snippet;
  }

  let { title, badge, children }: Props = $props();
</script>

<div class="flex items-center justify-between mb-6">
  <div class="flex items-center gap-3">
    <h2 class="text-xl font-bold text-[var(--theme-text)]">{title}</h2>
    {#if badge}
      {@render badge()}
    {/if}
  </div>
  {#if children}
    <div class="flex items-center gap-2">
      {@render children()}
    </div>
  {/if}
</div>
