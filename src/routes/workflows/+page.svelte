<script lang="ts">
  import { onMount } from 'svelte';
  import { isConnected } from '$lib/stores/websocket.js';
  import {
    workflows,
    activeExecution,
    requestWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    initWorkflowHandlers,
  } from '$lib/stores/workflows.js';
  import type { WorkflowInfo } from '@luciaclaw/protocol';

  let showForm = $state(false);
  let editingId = $state<string | null>(null);

  // Form fields
  let formName = $state('');
  let formDescription = $state('');
  let formSteps = $state<StepForm[]>([]);

  interface StepForm {
    id: string;
    name: string;
    type: 'tool_call' | 'llm_inference' | 'delay';
    toolName: string;
    arguments: string;
    prompt: string;
    model: string;
    durationMs: number;
    dependsOn: string[];
    condition: string;
    retryMax: number;
  }

  const stepTypes = [
    { value: 'tool_call', label: 'Tool Call' },
    { value: 'llm_inference', label: 'LLM Inference' },
    { value: 'delay', label: 'Delay' },
  ];

  onMount(() => {
    initWorkflowHandlers();
  });

  $effect(() => {
    if ($isConnected) {
      requestWorkflows();
    }
  });

  function emptyStep(): StepForm {
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      type: 'tool_call',
      toolName: '',
      arguments: '{}',
      prompt: '',
      model: '',
      durationMs: 1000,
      dependsOn: [],
      condition: '',
      retryMax: 0,
    };
  }

  function resetForm() {
    formName = '';
    formDescription = '';
    formSteps = [];
    editingId = null;
    showForm = false;
  }

  function addStep() {
    formSteps = [...formSteps, emptyStep()];
  }

  function removeStep(index: number) {
    const removedId = formSteps[index].id;
    formSteps = formSteps.filter((_, i) => i !== index).map((s) => ({
      ...s,
      dependsOn: s.dependsOn.filter((d) => d !== removedId),
    }));
  }

  function toggleDependency(stepIndex: number, depId: string) {
    const step = formSteps[stepIndex];
    if (step.dependsOn.includes(depId)) {
      formSteps[stepIndex] = { ...step, dependsOn: step.dependsOn.filter((d) => d !== depId) };
    } else {
      formSteps[stepIndex] = { ...step, dependsOn: [...step.dependsOn, depId] };
    }
    formSteps = [...formSteps];
  }

  function handleSubmit() {
    if (!formName.trim() || formSteps.length === 0) return;

    const steps = formSteps.map((s) => {
      const base: Record<string, unknown> = {
        id: s.id,
        name: s.name || s.id,
        type: s.type,
      };
      if (s.dependsOn.length > 0) base.dependsOn = s.dependsOn;
      if (s.condition.trim()) base.condition = s.condition;
      if (s.retryMax > 0) base.retryMax = s.retryMax;

      if (s.type === 'tool_call') {
        base.toolName = s.toolName;
        try { base.arguments = JSON.parse(s.arguments); } catch { base.arguments = {}; }
      } else if (s.type === 'llm_inference') {
        base.prompt = s.prompt;
        if (s.model.trim()) base.model = s.model;
      } else if (s.type === 'delay') {
        base.durationMs = s.durationMs;
      }

      return base;
    });

    if (editingId) {
      updateWorkflow(editingId, { name: formName, description: formDescription, steps });
    } else {
      createWorkflow(formName, formDescription, steps);
    }
    resetForm();
  }

  function startEdit(wf: WorkflowInfo) {
    formName = wf.name;
    formDescription = wf.description;
    formSteps = wf.steps.map((s) => {
      const base: StepForm = {
        id: s.id,
        name: s.name,
        type: s.type,
        toolName: '',
        arguments: '{}',
        prompt: '',
        model: '',
        durationMs: 1000,
        dependsOn: s.dependsOn || [],
        condition: s.condition || '',
        retryMax: s.retryMax || 0,
      };
      if (s.type === 'tool_call') {
        base.toolName = s.toolName;
        base.arguments = JSON.stringify(s.arguments, null, 2);
      } else if (s.type === 'llm_inference') {
        base.prompt = s.prompt;
        base.model = s.model || '';
      } else if (s.type === 'delay') {
        base.durationMs = s.durationMs;
      }
      return base;
    });
    editingId = wf.id;
    showForm = true;
  }

  function handleDelete(id: string) {
    deleteWorkflow(id);
  }

  function handleExecute(id: string) {
    executeWorkflow(id);
  }

  function handleArchive(id: string, currentStatus: string) {
    updateWorkflow(id, { status: currentStatus === 'active' ? 'archived' : 'active' });
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'running': return 'status-running';
      case 'failed': return 'status-failed';
      case 'skipped': return 'status-skipped';
      default: return 'status-pending';
    }
  }

  function formatTime(ts: number | undefined): string {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  }
</script>

<div class="workflows-page">
  <div class="header">
    <div class="header-left">
      <h2>Workflows</h2>
      {#if $workflows.filter(w => w.status === 'active').length > 0}
        <span class="active-badge">{$workflows.filter(w => w.status === 'active').length} active</span>
      {/if}
    </div>
    <button class="btn btn-primary" onclick={() => { resetForm(); showForm = !showForm; if (showForm && formSteps.length === 0) addStep(); }}>
      {showForm ? 'Cancel' : 'New Workflow'}
    </button>
  </div>

  {#if $activeExecution}
    <div class="execution-panel">
      <div class="exec-header">
        <strong>{$activeExecution.workflowName}</strong>
        <span class="status-badge {statusClass($activeExecution.status)}">{$activeExecution.status}</span>
      </div>
      <div class="step-progress">
        {#each $activeExecution.steps as step}
          <div class="step-row">
            <span class="step-indicator {statusClass(step.status)}"></span>
            <span class="step-name">{step.name}</span>
            <span class="step-type">{step.type}</span>
            <span class="step-status">{step.status}</span>
            {#if step.error}
              <span class="step-error">{step.error}</span>
            {/if}
          </div>
        {/each}
      </div>
      {#if $activeExecution.status === 'completed' || $activeExecution.status === 'failed'}
        <button class="btn btn-sm" onclick={() => activeExecution.set(null)}>Dismiss</button>
      {/if}
    </div>
  {/if}

  {#if showForm}
    <section class="form-section">
      <h3>{editingId ? 'Edit Workflow' : 'Create Workflow'}</h3>

      <div class="form-group">
        <label for="wf-name">Name</label>
        <input id="wf-name" type="text" bind:value={formName} placeholder="Email digest pipeline" />
      </div>

      <div class="form-group">
        <label for="wf-desc">Description</label>
        <input id="wf-desc" type="text" bind:value={formDescription} placeholder="Fetch, summarize, and send daily email digest" />
      </div>

      <div class="steps-section">
        <div class="steps-header">
          <label>Steps</label>
          <button class="btn btn-sm" onclick={addStep}>Add Step</button>
        </div>

        {#each formSteps as step, i}
          <div class="step-card">
            <div class="step-card-header">
              <span class="step-number">#{i + 1}</span>
              <input type="text" bind:value={formSteps[i].id} placeholder="step_id" class="step-id-input mono" />
              <input type="text" bind:value={formSteps[i].name} placeholder="Step name" class="step-name-input" />
              <select bind:value={formSteps[i].type}>
                {#each stepTypes as st}
                  <option value={st.value}>{st.label}</option>
                {/each}
              </select>
              <button class="btn btn-sm btn-danger" onclick={() => removeStep(i)}>Remove</button>
            </div>

            {#if step.type === 'tool_call'}
              <div class="step-fields">
                <div class="form-group">
                  <label>Tool Name</label>
                  <input type="text" bind:value={formSteps[i].toolName} placeholder="gmail.send" class="mono" />
                </div>
                <div class="form-group">
                  <label>Arguments (JSON)</label>
                  <textarea bind:value={formSteps[i].arguments} rows="3" class="mono" placeholder={'{"to": "{{variables.recipient}}"}'}></textarea>
                </div>
              </div>
            {:else if step.type === 'llm_inference'}
              <div class="step-fields">
                <div class="form-group">
                  <label>Prompt</label>
                  <textarea bind:value={formSteps[i].prompt} rows="3" placeholder={'Summarize: {{steps.fetch.output}}'}></textarea>
                </div>
                <div class="form-group">
                  <label>Model (optional)</label>
                  <input type="text" bind:value={formSteps[i].model} placeholder="Default model" />
                </div>
              </div>
            {:else if step.type === 'delay'}
              <div class="step-fields">
                <div class="form-group">
                  <label>Duration (ms)</label>
                  <input type="number" bind:value={formSteps[i].durationMs} min="0" step="1000" />
                </div>
              </div>
            {/if}

            {#if i > 0}
              <div class="step-deps">
                <label>Depends on:</label>
                <div class="dep-chips">
                  {#each formSteps.slice(0, i) as priorStep}
                    <button
                      class="dep-chip"
                      class:selected={step.dependsOn.includes(priorStep.id)}
                      onclick={() => toggleDependency(i, priorStep.id)}
                    >
                      {priorStep.name || priorStep.id}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="step-extras">
              <div class="form-group inline">
                <label>Condition</label>
                <input type="text" bind:value={formSteps[i].condition} placeholder="steps.step1.output.success == true" class="mono" />
              </div>
              <div class="form-group inline">
                <label>Retries</label>
                <input type="number" bind:value={formSteps[i].retryMax} min="0" max="10" />
              </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="form-actions">
        <button class="btn" onclick={resetForm}>Cancel</button>
        <button
          class="btn btn-primary"
          onclick={handleSubmit}
          disabled={!formName.trim() || formSteps.length === 0}
        >
          {editingId ? 'Update' : 'Create'}
        </button>
      </div>
    </section>
  {/if}

  {#if !$isConnected}
    <p class="placeholder-text">Connect to the Agent CVM to manage workflows.</p>
  {:else if $workflows.length === 0 && !showForm}
    <div class="empty-state">
      <p>No workflows yet.</p>
      <p class="hint">Create a workflow to automate multi-step tasks like email digests, report generation, or data pipelines.</p>
    </div>
  {:else}
    <div class="workflow-list">
      {#each $workflows as wf}
        <div class="workflow-card" class:archived={wf.status === 'archived'}>
          <div class="card-header">
            <div class="card-info">
              <span class="card-name">{wf.name}</span>
              <span class="card-desc">{wf.description}</span>
            </div>
            <div class="card-meta">
              <span class="step-count">{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
              <span class="status-badge" class:active={wf.status === 'active'}>{wf.status}</span>
            </div>
          </div>

          <div class="card-steps-preview">
            {#each wf.steps as step, i}
              {#if i > 0}<span class="step-arrow">&rarr;</span>{/if}
              <span class="step-chip" class:tool_call={step.type === 'tool_call'} class:llm_inference={step.type === 'llm_inference'} class:delay={step.type === 'delay'}>
                {step.name}
              </span>
            {/each}
          </div>

          <div class="card-actions">
            {#if wf.status === 'active'}
              <button class="btn btn-sm btn-primary" onclick={() => handleExecute(wf.id)}>Execute</button>
            {/if}
            <button class="btn btn-sm" onclick={() => startEdit(wf)}>Edit</button>
            <button class="btn btn-sm" onclick={() => handleArchive(wf.id, wf.status)}>
              {wf.status === 'active' ? 'Archive' : 'Restore'}
            </button>
            <button class="btn btn-sm btn-danger" onclick={() => handleDelete(wf.id)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .workflows-page {
    max-width: 800px;
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

  h2 { font-size: 1.5rem; margin: 0; }
  h3 { font-size: 1rem; margin-bottom: 1rem; }

  .active-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  /* Execution panel */
  .execution-panel {
    padding: 1rem;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    border: 1px solid var(--color-primary);
    margin-bottom: 1.5rem;
  }

  .exec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .step-progress {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  .step-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .step-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
    flex-shrink: 0;
  }

  .step-indicator.status-completed { background: var(--color-success); }
  .step-indicator.status-running { background: var(--color-warning); animation: pulse 1s infinite; }
  .step-indicator.status-failed { background: var(--color-error); }
  .step-indicator.status-skipped { background: var(--color-text-muted); opacity: 0.5; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .step-name { font-weight: 500; }
  .step-type { color: var(--color-text-muted); font-size: 0.75rem; }
  .step-status { margin-left: auto; font-size: 0.75rem; }
  .step-error { color: var(--color-error); font-size: 0.75rem; }

  /* Form */
  .form-section {
    padding: 1.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .form-group.inline {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0;
  }

  .form-group.inline label {
    min-width: 60px;
    margin-bottom: 0;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  input[type="text"], input[type="number"], textarea, select {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--color-text);
    resize: vertical;
  }

  input:focus, textarea:focus, select:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .mono { font-family: var(--font-mono); font-size: 0.8rem; }

  .steps-section { margin-bottom: 1rem; }

  .steps-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .step-card {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    margin-bottom: 0.75rem;
  }

  .step-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .step-number {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    min-width: 1.5rem;
  }

  .step-id-input { width: 120px; font-size: 0.8rem; }
  .step-name-input { flex: 1; min-width: 120px; }

  select {
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
  }

  .step-fields { margin-bottom: 0.5rem; }
  .step-fields .form-group { margin-bottom: 0.5rem; }

  .step-deps {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .step-deps label {
    font-size: 0.75rem;
    min-width: auto;
    text-transform: none;
    letter-spacing: normal;
  }

  .dep-chips { display: flex; gap: 0.3rem; flex-wrap: wrap; }

  .dep-chip {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: var(--color-surface-hover);
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.15s;
  }

  .dep-chip:hover { background: var(--color-border); }

  .dep-chip.selected {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .step-extras {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .step-extras input[type="text"] { flex: 1; font-size: 0.8rem; }
  .step-extras input[type="number"] { width: 60px; font-size: 0.8rem; }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  /* Buttons */
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

  .btn:hover:not(:disabled) { background: var(--color-border); }
  .btn-primary { background: var(--color-primary); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }

  .btn-danger {
    background: transparent;
    border: 1px solid var(--color-error);
    color: var(--color-error);
  }

  .btn-danger:hover:not(:disabled) { background: var(--color-error); color: white; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }

  /* Status badges */
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

  .status-badge.status-completed {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .status-badge.status-running {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  .status-badge.status-failed {
    background: color-mix(in srgb, var(--color-error) 15%, transparent);
    color: var(--color-error);
  }

  /* List */
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

  .empty-state p { margin: 0.25rem 0; }
  .hint { font-size: 0.75rem; color: var(--color-text-muted); }

  .workflow-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .workflow-card {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .workflow-card.archived { opacity: 0.6; }

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

  .card-name { font-weight: 600; font-size: 0.95rem; }

  .card-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .step-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .card-steps-preview {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .step-chip {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: var(--color-surface-hover);
  }

  .step-chip.tool_call { border-left: 2px solid var(--color-primary); }
  .step-chip.llm_inference { border-left: 2px solid var(--color-warning); }
  .step-chip.delay { border-left: 2px solid var(--color-text-muted); }

  .step-arrow {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
