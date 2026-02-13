<script lang="ts">
  import { onMount } from 'svelte';
  import { isConnected } from '$lib/stores/websocket.js';
  import {
    memories,
    memoryTotal,
    requestMemories,
    searchMemories,
    deleteMemory,
    initMemoryHandlers,
  } from '$lib/stores/memories.js';
  import { Search, Brain, Trash2 } from '@lucide/svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Button from '$lib/components/Button.svelte';

  let searchQuery = $state('');
  let selectedCategory = $state('');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let confirmDeleteId = $state<string | null>(null);

  const categories = [
    { value: '', label: 'All' },
    { value: 'fact', label: 'Facts' },
    { value: 'preference', label: 'Preferences' },
    { value: 'event', label: 'Events' },
    { value: 'decision', label: 'Decisions' },
    { value: 'relationship', label: 'Relationships' },
    { value: 'general', label: 'General' },
  ];

  onMount(() => {
    initMemoryHandlers();
  });

  $effect(() => {
    if ($isConnected) {
      requestMemories();
    }
  });

  function handleSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMemories(searchQuery.trim(), selectedCategory || undefined);
      } else {
        requestMemories(selectedCategory || undefined);
      }
    }, 300);
  }

  function handleCategoryChange() {
    if (searchQuery.trim()) {
      searchMemories(searchQuery.trim(), selectedCategory || undefined);
    } else {
      requestMemories(selectedCategory || undefined);
    }
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteMemory(id);
      confirmDeleteId = null;
    } else {
      confirmDeleteId = id;
      setTimeout(() => { confirmDeleteId = null; }, 3000);
    }
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const categoryVariant: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    fact: 'primary',
    preference: 'success',
    event: 'warning',
    decision: 'info',
    relationship: 'error',
    general: 'neutral',
  };
</script>

<div class="max-w-2xl mx-auto px-4 md:px-6 py-8">
  <PageHeader title="Memory">
    {#snippet badge()}
      {#if $memoryTotal > 0}
        <Badge variant="primary">{$memoryTotal} stored</Badge>
      {/if}
    {/snippet}
  </PageHeader>

  {#if !$isConnected}
    <EmptyState icon={Brain} title="Connect to the Agent CVM to view stored memories." />
  {:else}
    <div class="flex gap-2 mb-5">
      <div class="relative flex-1">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
        <input
          type="text"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors placeholder:text-[var(--theme-text-muted)]"
          placeholder="Search memories..."
          bind:value={searchQuery}
          oninput={handleSearchInput}
        />
      </div>
      <select
        class="px-3 py-2 text-sm rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors cursor-pointer"
        bind:value={selectedCategory}
        onchange={handleCategoryChange}
      >
        {#each categories as cat}
          <option value={cat.value}>{cat.label}</option>
        {/each}
      </select>
    </div>

    {#if $memories.length === 0}
      <EmptyState
        icon={Brain}
        title={searchQuery.trim() ? `No memories found for "${searchQuery}"` : 'No memories stored yet.'}
        description={searchQuery.trim() ? undefined : 'Lucia will automatically remember important facts, preferences, and decisions from your conversations.'}
      />
    {:else}
      <div class="flex flex-col gap-3">
        {#each $memories as memory}
          <div class="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-border-strong)] transition-colors">
            <div class="flex items-center justify-between mb-2">
              <Badge variant={categoryVariant[memory.category] || 'neutral'}>{memory.category}</Badge>
              <span class="text-[0.65rem] text-[var(--theme-text-muted)]">{formatDate(memory.createdAt)}</span>
            </div>
            <p class="text-sm leading-relaxed text-[var(--theme-text)]">{memory.content}</p>
            <div class="flex items-center justify-between mt-3">
              <span class="text-[0.65rem] text-[var(--theme-text-muted)]">
                {memory.accessCount} {memory.accessCount === 1 ? 'recall' : 'recalls'}
              </span>
              <Button
                variant={confirmDeleteId === memory.id ? 'danger' : 'ghost'}
                size="sm"
                onclick={() => handleDelete(memory.id)}
              >
                {#if confirmDeleteId === memory.id}
                  Confirm
                {:else}
                  <Trash2 size={12} />
                {/if}
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
