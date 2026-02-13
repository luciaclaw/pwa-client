<script lang="ts">
  import type { Component } from 'svelte';
  import { page } from '$app/state';

  interface Props {
    href: string;
    label: string;
    icon?: Component;
  }

  let { href, label, icon }: Props = $props();

  const isActive = $derived(
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href)
  );
</script>

<a
  {href}
  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150
    {isActive
      ? 'text-[var(--theme-primary)] bg-[var(--theme-primary-muted)]'
      : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface-hover)]'}"
>
  {#if icon}
    {@const Icon = icon}
    <Icon size={16} />
  {/if}
  <span class="hidden md:inline">{label}</span>
</a>
