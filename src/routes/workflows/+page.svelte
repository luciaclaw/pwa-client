<script lang="ts">
  import { onMount } from 'svelte';
  import { isConnected } from '$lib/stores/websocket.js';
  import {
    workflows, activeExecution,
    requestWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, executeWorkflow, initWorkflowHandlers,
  } from '$lib/stores/workflows.js';
  import type { WorkflowInfo } from '@luciaclaw/protocol';
  import { Plus, Play, Pencil, Archive, RotateCcw, Trash2, ArrowRight, GitBranch, X } from '@lucide/svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Section from '$lib/components/Section.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Textarea from '$lib/components/Textarea.svelte';

  let showForm = $state(false);
  let editingId = $state<string | null>(null);
  let formName = $state('');
  let formDescription = $state('');
  let formSteps = $state<StepForm[]>([]);

  interface StepForm {
    id: string; name: string; type: 'tool_call' | 'llm_inference' | 'delay';
    toolName: string; arguments: string; prompt: string; model: string;
    durationMs: number; dependsOn: string[]; condition: string; retryMax: number;
  }

  const stepTypes = [
    { value: 'tool_call', label: 'Tool Call' },
    { value: 'llm_inference', label: 'LLM Inference' },
    { value: 'delay', label: 'Delay' },
  ];

  onMount(() => { initWorkflowHandlers(); });
  $effect(() => { if ($isConnected) requestWorkflows(); });

  function emptyStep(): StepForm {
    return { id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', type: 'tool_call', toolName: '', arguments: '{}', prompt: '', model: '', durationMs: 1000, dependsOn: [], condition: '', retryMax: 0 };
  }

  function resetForm() { formName = ''; formDescription = ''; formSteps = []; editingId = null; showForm = false; }
  function addStep() { formSteps = [...formSteps, emptyStep()]; }
  function removeStep(index: number) {
    const removedId = formSteps[index].id;
    formSteps = formSteps.filter((_, i) => i !== index).map(s => ({ ...s, dependsOn: s.dependsOn.filter(d => d !== removedId) }));
  }

  function toggleDependency(stepIndex: number, depId: string) {
    const step = formSteps[stepIndex];
    if (step.dependsOn.includes(depId)) {
      formSteps[stepIndex] = { ...step, dependsOn: step.dependsOn.filter(d => d !== depId) };
    } else {
      formSteps[stepIndex] = { ...step, dependsOn: [...step.dependsOn, depId] };
    }
    formSteps = [...formSteps];
  }

  function handleSubmit() {
    if (!formName.trim() || formSteps.length === 0) return;
    const steps = formSteps.map(s => {
      const base: Record<string, unknown> = { id: s.id, name: s.name || s.id, type: s.type };
      if (s.dependsOn.length > 0) base.dependsOn = s.dependsOn;
      if (s.condition.trim()) base.condition = s.condition;
      if (s.retryMax > 0) base.retryMax = s.retryMax;
      if (s.type === 'tool_call') { base.toolName = s.toolName; try { base.arguments = JSON.parse(s.arguments); } catch { base.arguments = {}; } }
      else if (s.type === 'llm_inference') { base.prompt = s.prompt; if (s.model.trim()) base.model = s.model; }
      else if (s.type === 'delay') { base.durationMs = s.durationMs; }
      return base;
    });
    if (editingId) { updateWorkflow(editingId, { name: formName, description: formDescription, steps }); }
    else { createWorkflow(formName, formDescription, steps); }
    resetForm();
  }

  function startEdit(wf: WorkflowInfo) {
    formName = wf.name; formDescription = wf.description;
    formSteps = wf.steps.map(s => {
      const base: StepForm = { id: s.id, name: s.name, type: s.type, toolName: '', arguments: '{}', prompt: '', model: '', durationMs: 1000, dependsOn: s.dependsOn || [], condition: s.condition || '', retryMax: s.retryMax || 0 };
      if (s.type === 'tool_call') { base.toolName = s.toolName; base.arguments = JSON.stringify(s.arguments, null, 2); }
      else if (s.type === 'llm_inference') { base.prompt = s.prompt; base.model = s.model || ''; }
      else if (s.type === 'delay') { base.durationMs = s.durationMs; }
      return base;
    });
    editingId = wf.id; showForm = true;
  }

  function statusClass(status: string): 'success' | 'warning' | 'error' | 'neutral' {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'error';
      default: return 'neutral';
    }
  }

  function stepTypeVariant(type: string): string {
    switch (type) {
      case 'tool_call': return 'border-l-2 border-l-[var(--theme-primary)]';
      case 'llm_inference': return 'border-l-2 border-l-[var(--theme-warning)]';
      case 'delay': return 'border-l-2 border-l-[var(--theme-text-muted)]';
      default: return '';
    }
  }
</script>

<div class="max-w-3xl mx-auto px-4 md:px-6 py-8">
  <PageHeader title="Workflows">
    {#snippet badge()}
      {#if $workflows.filter(w => w.status === 'active').length > 0}
        <Badge variant="success">{$workflows.filter(w => w.status === 'active').length} active</Badge>
      {/if}
    {/snippet}
    <Button variant="primary" size="sm" onclick={() => { resetForm(); showForm = !showForm; if (!showForm) return; if (formSteps.length === 0) addStep(); }}>
      {#if showForm}Cancel{:else}<Plus size={14} /> New Workflow{/if}
    </Button>
  </PageHeader>

  {#if $activeExecution}
    <div class="mb-5 p-4 rounded-xl border border-[var(--theme-primary)] bg-[var(--theme-primary-muted)]">
      <div class="flex items-center justify-between mb-3">
        <strong class="text-sm">{$activeExecution.workflowName}</strong>
        <Badge variant={statusClass($activeExecution.status)}>{$activeExecution.status}</Badge>
      </div>
      <div class="flex flex-col gap-1.5 mb-3">
        {#each $activeExecution.steps as step}
          <div class="flex items-center gap-2 text-xs">
            <span class="w-2 h-2 rounded-full shrink-0
              {step.status === 'completed' ? 'bg-[var(--theme-success)]' : step.status === 'running' ? 'bg-[var(--theme-warning)] animate-pulse' : step.status === 'failed' ? 'bg-[var(--theme-error)]' : 'bg-[var(--theme-text-muted)] opacity-50'}"></span>
            <span class="font-medium">{step.name}</span>
            <span class="text-[var(--theme-text-muted)]">{step.type}</span>
            <span class="ml-auto text-[var(--theme-text-muted)]">{step.status}</span>
            {#if step.error}<span class="text-[var(--theme-error)]">{step.error}</span>{/if}
          </div>
        {/each}
      </div>
      {#if $activeExecution.status === 'completed' || $activeExecution.status === 'failed'}
        <Button variant="ghost" size="sm" onclick={() => activeExecution.set(null)}>Dismiss</Button>
      {/if}
    </div>
  {/if}

  {#if showForm}
    <div class="mb-5">
      <Section title={editingId ? 'Edit Workflow' : 'Create Workflow'}>
        <div class="space-y-4">
          <Input label="Name" bind:value={formName} placeholder="Email digest pipeline" />
          <Input label="Description" bind:value={formDescription} placeholder="Fetch, summarize, and send daily email digest" />

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Steps</span>
              <Button variant="ghost" size="sm" onclick={addStep}><Plus size={12} /> Add Step</Button>
            </div>
            {#each formSteps as step, i}
              <div class="p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] space-y-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-bold text-[var(--theme-text-muted)]">#{i + 1}</span>
                  <input type="text" bind:value={formSteps[i].id} placeholder="step_id" class="w-28 px-2 py-1 text-xs font-mono rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)]" />
                  <input type="text" bind:value={formSteps[i].name} placeholder="Step name" class="flex-1 min-w-[120px] px-2 py-1 text-xs rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)]" />
                  <select bind:value={formSteps[i].type} class="px-2 py-1 text-xs rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)]">
                    {#each stepTypes as st}<option value={st.value}>{st.label}</option>{/each}
                  </select>
                  <Button variant="danger" size="sm" onclick={() => removeStep(i)}><X size={12} /></Button>
                </div>
                {#if step.type === 'tool_call'}
                  <Input label="Tool Name" bind:value={formSteps[i].toolName} placeholder="gmail.send" mono />
                  <Textarea label="Arguments (JSON)" bind:value={formSteps[i].arguments} rows={3} mono />
                {:else if step.type === 'llm_inference'}
                  <Textarea label="Prompt" bind:value={formSteps[i].prompt} rows={3} />
                  <Input label="Model (optional)" bind:value={formSteps[i].model} placeholder="Default model" />
                {:else if step.type === 'delay'}
                  <Input label="Duration (ms)" type="number" bind:value={formSteps[i].durationMs} min={0} step={1000} />
                {/if}
                {#if i > 0}
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[0.65rem] text-[var(--theme-text-muted)]">Depends on:</span>
                    {#each formSteps.slice(0, i) as priorStep}
                      <button
                        class="px-2 py-0.5 text-[0.6rem] rounded border transition-all
                          {step.dependsOn.includes(priorStep.id) ? 'bg-[var(--theme-primary-muted)] border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'bg-[var(--theme-surface-hover)] border-transparent text-[var(--theme-text)] hover:bg-[var(--theme-surface-active)]'}"
                        onclick={() => toggleDependency(i, priorStep.id)}
                      >{priorStep.name || priorStep.id}</button>
                    {/each}
                  </div>
                {/if}
                <div class="flex gap-3 items-center">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-[0.65rem] text-[var(--theme-text-muted)] shrink-0">Condition</span>
                    <input type="text" bind:value={formSteps[i].condition} placeholder="steps.step1.output.success == true" class="flex-1 px-2 py-1 text-xs font-mono rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)]" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[0.65rem] text-[var(--theme-text-muted)]">Retries</span>
                    <input type="number" bind:value={formSteps[i].retryMax} min={0} max={10} class="w-14 px-2 py-1 text-xs rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)]" />
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <div class="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onclick={resetForm}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!formName.trim() || formSteps.length === 0} onclick={handleSubmit}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  {/if}

  {#if !$isConnected}
    <EmptyState icon={GitBranch} title="Connect to the Agent CVM to manage workflows." />
  {:else if $workflows.length === 0 && !showForm}
    <EmptyState icon={GitBranch} title="No workflows yet." description="Create a workflow to automate multi-step tasks like email digests, report generation, or data pipelines." />
  {:else}
    <div class="flex flex-col gap-3">
      {#each $workflows as wf}
        <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] {wf.status === 'archived' ? 'opacity-50' : ''}">
          <div class="flex items-start justify-between mb-2">
            <div class="flex flex-col gap-0.5">
              <span class="font-semibold text-sm">{wf.name}</span>
              <span class="text-xs text-[var(--theme-text-muted)]">{wf.description}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[0.65rem] text-[var(--theme-text-muted)]">{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
              <Badge variant={wf.status === 'active' ? 'success' : 'neutral'}>{wf.status}</Badge>
            </div>
          </div>
          <div class="flex items-center flex-wrap gap-1.5 mb-3">
            {#each wf.steps as step, i}
              {#if i > 0}<ArrowRight size={12} class="text-[var(--theme-text-muted)]" />{/if}
              <span class="px-2 py-0.5 text-[0.65rem] rounded bg-[var(--theme-surface-hover)] {stepTypeVariant(step.type)}">{step.name}</span>
            {/each}
          </div>
          <div class="flex gap-2">
            {#if wf.status === 'active'}
              <Button variant="primary" size="sm" onclick={() => executeWorkflow(wf.id)}><Play size={12} /> Execute</Button>
            {/if}
            <Button variant="ghost" size="sm" onclick={() => startEdit(wf)}><Pencil size={12} /> Edit</Button>
            <Button variant="ghost" size="sm" onclick={() => updateWorkflow(wf.id, { status: wf.status === 'active' ? 'archived' : 'active' })}>
              {#if wf.status === 'active'}<Archive size={12} /> Archive{:else}<RotateCcw size={12} /> Restore{/if}
            </Button>
            <Button variant="danger" size="sm" onclick={() => deleteWorkflow(wf.id)}><Trash2 size={12} /> Delete</Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
