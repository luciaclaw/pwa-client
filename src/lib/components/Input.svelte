<script lang="ts">
  interface Props {
    label?: string;
    type?: 'text' | 'password' | 'number' | 'email' | 'url';
    value?: string | number;
    placeholder?: string;
    error?: string;
    mono?: boolean;
    disabled?: boolean;
    id?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let {
    label,
    type = 'text',
    value = $bindable(''),
    placeholder,
    error,
    mono = false,
    disabled = false,
    id,
    min,
    max,
    step,
    oninput,
    onchange,
    onkeydown,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={id} class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
      {label}
    </label>
  {/if}
  <input
    {id}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {min}
    {max}
    {step}
    {oninput}
    {onchange}
    {onkeydown}
    class="w-full px-3 py-2 text-sm rounded-lg bg-[var(--theme-bg)] border transition-colors duration-150 placeholder:text-[var(--theme-text-muted)]
      {mono ? 'font-mono text-[0.8rem]' : ''}
      {error ? 'border-[var(--theme-error)]' : 'border-[var(--theme-border)] focus:border-[var(--theme-primary)]'}
      {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  />
  {#if error}
    <span class="text-xs text-[var(--theme-error)]">{error}</span>
  {/if}
</div>
