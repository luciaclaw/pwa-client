<script lang="ts">
  interface Props {
    checked?: boolean;
    label?: string;
    onchange?: (checked: boolean) => void;
  }

  let { checked = $bindable(false), label, onchange }: Props = $props();

  function handleToggle() {
    checked = !checked;
    onchange?.(checked);
  }
</script>

<button
  type="button"
  class="inline-flex items-center gap-2.5 cursor-pointer"
  onclick={handleToggle}
  role="switch"
  aria-checked={checked}
>
  <span
    class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200
      {checked ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-surface-active)]'}"
  >
    <span
      class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
        {checked ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'}"
    ></span>
  </span>
  {#if label}
    <span class="text-sm text-[var(--theme-text)]">{label}</span>
  {/if}
</button>
