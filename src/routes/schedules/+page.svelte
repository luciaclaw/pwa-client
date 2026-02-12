<script lang="ts">
  import { onMount } from 'svelte';
  import { isConnected } from '$lib/stores/websocket.js';
  import {
    schedules,
    activeCount,
    lastExecution,
    requestSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    initScheduleHandlers,
  } from '$lib/stores/schedules.js';

  let showForm = $state(false);
  let editingId = $state<string | null>(null);

  // Form fields
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

  onMount(() => {
    initScheduleHandlers();
  });

  $effect(() => {
    if ($isConnected) {
      requestSchedules();
    }
  });

  function resetForm() {
    formName = '';
    formCron = '0 8 * * *';
    formTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    formPrompt = '';
    editingId = null;
    showForm = false;
  }

  function handleSubmit() {
    if (!formName.trim() || !formCron.trim() || !formPrompt.trim()) return;

    if (editingId) {
      updateSchedule(editingId, {
        name: formName,
        cronExpression: formCron,
        timezone: formTimezone,
        prompt: formPrompt,
      });
    } else {
      createSchedule(formName, formCron, formTimezone, formPrompt);
    }
    resetForm();
  }

  function startEdit(schedule: typeof $schedules[0]) {
    formName = schedule.name;
    formCron = schedule.cronExpression;
    formTimezone = schedule.timezone;
    formPrompt = schedule.prompt;
    editingId = schedule.id;
    showForm = true;
  }

  function handleDelete(id: string) {
    deleteSchedule(id);
  }

  function handleToggle(id: string, status: 'active' | 'paused') {
    toggleSchedule(id, status);
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

  function handlePreset(value: string) {
    formCron = value;
  }
</script>

<div class="schedules-page">
  <div class="header">
    <div class="header-left">
      <h2>Scheduled Tasks</h2>
      {#if $activeCount > 0}
        <span class="active-badge">{$activeCount} active</span>
      {/if}
    </div>
    <button class="btn btn-primary" onclick={() => { resetForm(); showForm = !showForm; }}>
      {showForm ? 'Cancel' : 'New Schedule'}
    </button>
  </div>

  {#if $lastExecution}
    <div class="execution-toast">
      <strong>{$lastExecution.name}</strong> executed
      <p class="toast-content">{$lastExecution.responseContent.substring(0, 150)}{$lastExecution.responseContent.length > 150 ? '...' : ''}</p>
    </div>
  {/if}

  {#if showForm}
    <section class="form-section">
      <h3>{editingId ? 'Edit Schedule' : 'Create Schedule'}</h3>

      <div class="form-group">
        <label for="schedule-name">Name</label>
        <input
          id="schedule-name"
          type="text"
          bind:value={formName}
          placeholder="Morning briefing"
        />
      </div>

      <div class="form-group">
        <label for="schedule-cron">Schedule</label>
        <div class="preset-row">
          {#each cronPresets as preset}
            <button
              class="preset-btn"
              class:active={formCron === preset.value}
              onclick={() => handlePreset(preset.value)}
            >
              {preset.label}
            </button>
          {/each}
        </div>
        <input
          id="schedule-cron"
          type="text"
          bind:value={formCron}
          placeholder="0 8 * * *"
          class="mono"
        />
        <span class="hint">{cronToHuman(formCron)}</span>
      </div>

      <div class="form-group">
        <label for="schedule-tz">Timezone</label>
        <input
          id="schedule-tz"
          type="text"
          bind:value={formTimezone}
          placeholder="America/New_York"
        />
      </div>

      <div class="form-group">
        <label for="schedule-prompt">Prompt</label>
        <textarea
          id="schedule-prompt"
          bind:value={formPrompt}
          placeholder="Give me a morning briefing with weather, calendar events, and email summary."
          rows="4"
        ></textarea>
      </div>

      <div class="form-actions">
        <button class="btn" onclick={resetForm}>Cancel</button>
        <button
          class="btn btn-primary"
          onclick={handleSubmit}
          disabled={!formName.trim() || !formCron.trim() || !formPrompt.trim()}
        >
          {editingId ? 'Update' : 'Create'}
        </button>
      </div>
    </section>
  {/if}

  {#if !$isConnected}
    <p class="placeholder-text">
      Connect to the Agent CVM to manage scheduled tasks.
    </p>
  {:else if $schedules.length === 0 && !showForm}
    <div class="empty-state">
      <p>No scheduled tasks yet.</p>
      <p class="hint">Create a schedule to automate recurring tasks like morning briefings, email triage, or weekly reports.</p>
    </div>
  {:else}
    <div class="schedule-list">
      {#each $schedules as schedule}
        <div class="schedule-card" class:paused={schedule.status === 'paused'}>
          <div class="card-header">
            <div class="card-info">
              <span class="card-name">{schedule.name}</span>
              <span class="card-cron">{cronToHuman(schedule.cronExpression)}</span>
            </div>
            <span class="status-badge" class:active={schedule.status === 'active'}>
              {schedule.status}
            </span>
          </div>

          <p class="card-prompt">{schedule.prompt}</p>

          <div class="card-times">
            <span>Next: {formatTime(schedule.nextRunAt)}</span>
            <span>Last: {formatTime(schedule.lastRunAt)}</span>
          </div>

          <div class="card-actions">
            <button class="btn btn-sm" onclick={() => startEdit(schedule)}>
              Edit
            </button>
            <button
              class="btn btn-sm"
              onclick={() => handleToggle(schedule.id, schedule.status)}
            >
              {schedule.status === 'active' ? 'Pause' : 'Resume'}
            </button>
            <button
              class="btn btn-sm btn-danger"
              onclick={() => handleDelete(schedule.id)}
            >
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .schedules-page {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  h2 {
    font-size: 1.5rem;
    margin: 0;
  }

  .active-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .execution-toast {
    padding: 1rem;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid var(--color-primary);
    margin-bottom: 1.5rem;
  }

  .toast-content {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: 0.25rem;
  }

  .form-section {
    padding: 1.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  input[type="text"], textarea {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--color-text);
    resize: vertical;
  }

  input[type="text"]:focus, textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .preset-btn {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: var(--color-surface-hover);
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.15s;
  }

  .preset-btn:hover {
    background: var(--color-border);
  }

  .preset-btn.active {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--color-surface-hover);
    transition: background 0.15s;
    cursor: pointer;
    border: none;
    color: var(--color-text);
  }

  .btn:hover:not(:disabled) {
    background: var(--color-border);
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-danger {
    background: transparent;
    border: 1px solid var(--color-error);
    color: var(--color-error);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--color-error);
    color: white;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-sm {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
  }

  .placeholder-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: 3rem 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 0;
    color: var(--color-text-muted);
  }

  .empty-state p {
    margin: 0.25rem 0;
  }

  .schedule-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .schedule-card {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .schedule-card.paused {
    opacity: 0.7;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .card-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .card-cron {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .status-badge.active {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .card-prompt {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0.5rem 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-times {
    display: flex;
    gap: 1.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-bottom: 0.75rem;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
