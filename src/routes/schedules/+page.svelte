<script lang="ts">
  import { onMount } from 'svelte';
  import { isConnected } from '$lib/stores/websocket.js';
  import {
    schedules, activeCount, lastExecution,
    requestSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule, initScheduleHandlers,
  } from '$lib/stores/schedules.js';
  import { Clock, Plus, Pencil, Pause, Play, Trash2 } from '@lucide/svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Section from '$lib/components/Section.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';

  let showForm = $state(false);
  let editingId = $state<string | null>(null);

  let formName = $state('');
  let formCron = $state('0 8 * * *');
  let formTimezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
  let formPrompt = $state('');

  const cronPresets = [
    { label: 'Every day at 8am', value: '0 8 * * *' },
    { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every Monday at 10am', value: '0 10 * * 1' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
  ];

  onMount(() => { initScheduleHandlers(); });

  $effect(() => { if ($isConnected) requestSchedules(); });

  function resetForm() {
    formName = ''; formCron = '0 8 * * *';
    formTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    formPrompt = ''; editingId = null; showForm = false;
  }

  function handleSubmit() {
    if (!formName.trim() || !formCron.trim() || !formPrompt.trim()) return;
    if (editingId) {
      updateSchedule(editingId, { name: formName, cronExpression: formCron, timezone: formTimezone, prompt: formPrompt });
    } else {
      createSchedule(formName, formCron, formTimezone, formPrompt);
    }
    resetForm();
  }

  function startEdit(schedule: typeof $schedules[0]) {
    formName = schedule.name; formCron = schedule.cronExpression;
    formTimezone = schedule.timezone; formPrompt = schedule.prompt;
    editingId = schedule.id; showForm = true;
  }

  function cronToHuman(cron: string): string {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;
    const [min, hour, dom, mon, dow] = parts;
    if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;
    if (hour === '*' && min === '0') return 'Every hour';
    const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    if (dom === '*' && mon === '*') {
      if (dow === '*') return `Daily at ${timeStr}`;
      if (dow === '1-5') return `Weekdays at ${timeStr}`;
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNum = parseInt(dow);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) return `${days[dayNum]}s at ${timeStr}`;
    }
    return cron;
  }

  function formatTime(ts: number | null): string {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  }
</script>

<div class="max-w-2xl mx-auto px-4 md:px-6 py-8">
  <PageHeader title="Scheduled Tasks">
    {#snippet badge()}
      {#if $activeCount > 0}
        <Badge variant="success">{$activeCount} active</Badge>
      {/if}
    {/snippet}
    <Button variant="primary" size="sm" onclick={() => { resetForm(); showForm = !showForm; }}>
      {#if showForm}Cancel{:else}<Plus size={14} /> New Schedule{/if}
    </Button>
  </PageHeader>

  {#if $lastExecution}
    <div class="mb-5">
      <Toast
        message="{$lastExecution.name} executed"
        variant="info"
        onclose={() => lastExecution.set(null)}
      />
    </div>
  {/if}

  {#if showForm}
    <div class="mb-5">
      <Section title={editingId ? 'Edit Schedule' : 'Create Schedule'}>
        <div class="space-y-4">
          <Input label="Name" bind:value={formName} placeholder="Morning briefing" />

          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Schedule</span>
            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each cronPresets as preset}
                <button
                  class="px-2.5 py-1 text-[0.65rem] rounded-full border transition-all
                    {formCron === preset.value
                      ? 'bg-[var(--theme-primary-muted)] border-[var(--theme-primary)] text-[var(--theme-primary)]'
                      : 'bg-[var(--theme-surface-hover)] border-transparent text-[var(--theme-text)] hover:bg-[var(--theme-surface-active)]'}"
                  onclick={() => { formCron = preset.value; }}
                >
                  {preset.label}
                </button>
              {/each}
            </div>
            <Input bind:value={formCron} placeholder="0 8 * * *" mono />
            <span class="text-[0.65rem] text-[var(--theme-text-muted)]">{cronToHuman(formCron)}</span>
          </div>

          <Input label="Timezone" bind:value={formTimezone} placeholder="America/New_York" />
          <Textarea label="Prompt" bind:value={formPrompt} placeholder="Give me a morning briefing with weather, calendar events, and email summary." rows={4} />

          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onclick={resetForm}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!formName.trim() || !formCron.trim() || !formPrompt.trim()} onclick={handleSubmit}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  {/if}

  {#if !$isConnected}
    <EmptyState icon={Clock} title="Connect to the Agent CVM to manage scheduled tasks." />
  {:else if $schedules.length === 0 && !showForm}
    <EmptyState icon={Clock} title="No scheduled tasks yet." description="Create a schedule to automate recurring tasks like morning briefings, email triage, or weekly reports." />
  {:else}
    <div class="flex flex-col gap-3">
      {#each $schedules as schedule}
        <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] transition-colors {schedule.status === 'paused' ? 'opacity-60' : ''}">
          <div class="flex items-start justify-between mb-1.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-semibold text-sm text-[var(--theme-text)]">{schedule.name}</span>
              <span class="text-xs text-[var(--theme-text-muted)]">{cronToHuman(schedule.cronExpression)}</span>
            </div>
            <Badge variant={schedule.status === 'active' ? 'success' : 'neutral'}>{schedule.status}</Badge>
          </div>
          <p class="text-xs text-[var(--theme-text-muted)] mb-2 line-clamp-2">{schedule.prompt}</p>
          <div class="flex gap-4 text-[0.65rem] text-[var(--theme-text-muted)] mb-3">
            <span>Next: {formatTime(schedule.nextRunAt)}</span>
            <span>Last: {formatTime(schedule.lastRunAt)}</span>
          </div>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" onclick={() => startEdit(schedule)}><Pencil size={12} /> Edit</Button>
            <Button variant="ghost" size="sm" onclick={() => toggleSchedule(schedule.id, schedule.status)}>
              {#if schedule.status === 'active'}<Pause size={12} /> Pause{:else}<Play size={12} /> Resume{/if}
            </Button>
            <Button variant="danger" size="sm" onclick={() => deleteSchedule(schedule.id)}><Trash2 size={12} /> Delete</Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
