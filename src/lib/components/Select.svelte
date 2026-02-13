<script lang="ts">
  interface Props {
    label?: string;
    value?: string;
    options: Array<{ value: string; label: string }>;
    id?: string;
    onchange?: (e: Event) => void;
  }

  let {
    label,
    value = $bindable(''),
    options,
    id,
    onchange,
  }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={id} class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
      {label}
    </label>
  {/if}
  <select
    {id}
    bind:value
    {onchange}
    class="w-full px-3 py-2 text-sm rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors duration-150 cursor-pointer"
  >
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
