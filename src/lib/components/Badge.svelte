<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral';
    size?: 'sm' | 'md';
    children: Snippet;
  }

  let { variant = 'neutral', size = 'sm', children }: Props = $props();

  const variantClasses = {
    success: 'bg-[var(--theme-success-muted)] text-[var(--theme-success)]',
    warning: 'bg-[var(--theme-warning-muted)] text-[var(--theme-warning)]',
    error: 'bg-[var(--theme-error-muted)] text-[var(--theme-error)]',
    info: 'bg-[var(--theme-info-muted)] text-[var(--theme-info)]',
    primary: 'bg-[var(--theme-primary-muted)] text-[var(--theme-primary)]',
    neutral: 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)]',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[0.65rem]',
    md: 'px-2.5 py-1 text-xs',
  };
</script>

<span class="inline-flex items-center font-semibold rounded-full whitespace-nowrap {variantClasses[variant]} {sizeClasses[size]}">
  {@render children()}
</span>
