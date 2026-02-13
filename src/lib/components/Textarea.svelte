<script lang="ts">
  interface Props {
    label?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    mono?: boolean;
    disabled?: boolean;
    id?: string;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let {
    label,
    value = $bindable(''),
    placeholder,
    rows = 3,
    mono = false,
    disabled = false,
    id,
    onkeydown,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={id} class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
      {label}
    </label>
  {/if}
  <textarea
    {id}
    bind:value
    {placeholder}
    {rows}
    {disabled}
    {onkeydown}
    class="w-full px-3 py-2 text-sm rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors duration-150 resize-y placeholder:text-[var(--theme-text-muted)]
      {mono ? 'font-mono text-[0.8rem]' : ''}
      {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  ></textarea>
</div>
