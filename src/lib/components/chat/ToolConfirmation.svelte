<script lang="ts">
  import Badge from '../Badge.svelte';
  import Button from '../Button.svelte';

  interface Props {
    description: string;
    risk: string;
    onapprove: () => void;
    ondeny: () => void;
  }

  let { description, risk, onapprove, ondeny }: Props = $props();

  const riskVariant = $derived(risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : 'info');
</script>

<div class="px-4 py-3 border-t border-[var(--theme-warning)] bg-[var(--theme-warning-muted)]">
  <div class="max-w-xl mx-auto space-y-2">
    <p class="text-sm font-semibold text-[var(--theme-warning)]">Action requires approval</p>
    <p class="text-sm text-[var(--theme-text)]">{description}</p>
    <Badge variant={riskVariant}>{risk} risk</Badge>
    <div class="flex gap-2 pt-1">
      <Button variant="primary" size="sm" onclick={onapprove}>Approve</Button>
      <Button variant="secondary" size="sm" onclick={ondeny}>Deny</Button>
    </div>
  </div>
</div>
