<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit';
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    type = 'button',
    onclick,
    children,
  }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-lg focus-ring select-none';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-4 py-2 text-sm gap-1.5',
    lg: 'px-6 py-2.5 text-base gap-2',
  };

  const variantClasses = {
    primary: 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] active:scale-[0.98]',
    secondary: 'bg-[var(--theme-surface-hover)] text-[var(--theme-text)] hover:bg-[var(--theme-surface-active)] border border-[var(--theme-border)]',
    ghost: 'bg-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text)]',
    danger: 'bg-transparent text-[var(--theme-error)] border border-[var(--theme-error)] hover:bg-[var(--theme-error)] hover:text-white',
    outline: 'bg-transparent text-[var(--theme-primary)] border border-[var(--theme-primary)] hover:bg-[var(--theme-primary-muted)]',
  };
</script>

<button
  {type}
  class="{baseClasses} {sizeClasses[size]} {variantClasses[variant]} {fullWidth ? 'w-full' : ''} {disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <span class="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
  {/if}
  {@render children()}
</button>
