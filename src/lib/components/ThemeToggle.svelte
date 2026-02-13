<script lang="ts">
  import { Sun, Moon, Monitor } from '@lucide/svelte';
  import { themePreference, setTheme, type ThemePreference } from '$lib/stores/theme.js';

  const options: { value: ThemePreference; icon: typeof Sun }[] = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
  ];

  function cycle() {
    const current = options.findIndex((o) => o.value === $themePreference);
    const next = (current + 1) % options.length;
    setTheme(options[next].value);
  }

  const currentOption = $derived(options.find((o) => o.value === $themePreference) || options[1]);
</script>

<button
  class="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface-hover)] transition-colors duration-150"
  onclick={cycle}
  title="Toggle theme ({$themePreference})"
>
  {#if currentOption.value === 'light'}
    <Sun size={16} />
  {:else if currentOption.value === 'dark'}
    <Moon size={16} />
  {:else}
    <Monitor size={16} />
  {/if}
</button>
