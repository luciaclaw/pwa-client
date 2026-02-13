<script lang="ts">
  interface Props {
    steps: string[];
    currentIndex: number;
  }

  let { steps, currentIndex }: Props = $props();
</script>

<div class="flex items-center w-full max-w-lg mx-auto mb-8">
  {#each steps as step, i}
    <div class="flex flex-col items-center shrink-0">
      <div
        class="w-3 h-3 rounded-full border-2 transition-all duration-200
          {i === currentIndex
            ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] shadow-[0_0_0_4px_var(--theme-primary-muted)]'
            : i < currentIndex
              ? 'bg-[var(--theme-success)] border-[var(--theme-success)]'
              : 'bg-[var(--theme-surface-hover)] border-[var(--theme-border)]'}"
      ></div>
      <span
        class="mt-1.5 text-[0.6rem] uppercase tracking-wider whitespace-nowrap
          {i === currentIndex
            ? 'text-[var(--theme-primary)] font-semibold'
            : 'text-[var(--theme-text-muted)]'}"
      >{step}</span>
    </div>
    {#if i < steps.length - 1}
      <div
        class="flex-1 h-0.5 mx-1 mb-5 transition-colors duration-200
          {i < currentIndex ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-border)]'}"
      ></div>
    {/if}
  {/each}
</div>
