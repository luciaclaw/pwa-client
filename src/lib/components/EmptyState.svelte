<script lang="ts">
  import type { Component } from 'svelte';

  interface Props {
    icon?: Component;
    title: string;
    description?: string;
  }

  let { icon, title, description }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
  {#if icon}
    {@const Icon = icon}
    <div class="mb-3 text-[var(--theme-text-muted)]">
      <Icon size={40} strokeWidth={1.5} />
    </div>
  {/if}
  <p class="text-sm text-[var(--theme-text-muted)]">{title}</p>
  {#if description}
    <p class="mt-1 text-xs text-[var(--theme-text-muted)] opacity-70 max-w-sm">{description}</p>
  {/if}
</div>
