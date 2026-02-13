<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';

  interface Props {
    description: string;
    risk: string;
    onapprove: () => void;
    ondeny: () => void;
  }

  let { description, risk, onapprove, ondeny }: Props = $props();

  const riskVariant = risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : 'info';
</script>

<div class="p-4 border-t border-[var(--theme-warning)] bg-[var(--theme-warning-muted)]">
  <div class="max-w-xl mx-auto">
    <p class="text-sm font-semibold text-[var(--theme-warning)] mb-1">Action requires approval</p>
    <p class="text-sm text-[var(--theme-text)] mb-2">{description}</p>
    <div class="mb-3">
      <Badge variant={riskVariant}>{risk} risk</Badge>
    </div>
    <div class="flex gap-2">
      <Button variant="primary" size="sm" onclick={onapprove}>Approve</Button>
      <Button variant="secondary" size="sm" onclick={ondeny}>Deny</Button>
    </div>
  </div>
</div>
