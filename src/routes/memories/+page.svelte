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
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => {
        confirmDeleteId = null;
      }, 3000);
    }
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function categoryColor(category: string): string {
    const colors: Record<string, string> = {
      fact: 'var(--color-primary)',
      preference: 'var(--color-success)',
      event: 'var(--color-warning)',
      decision: '#a855f7',
      relationship: '#ec4899',
      general: 'var(--color-text-muted)',
    };
    return colors[category] || colors.general;
  }
</script>

<div class="memories-page">
  <div class="header">
    <div class="header-left">
      <h2>Memory</h2>
      {#if $memoryTotal > 0}
        <span class="count-badge">{$memoryTotal} stored</span>
      {/if}
    </div>
  </div>

  {#if !$isConnected}
    <p class="placeholder-text">
      Connect to the Agent CVM to view stored memories.
    </p>
  {:else}
    <div class="controls">
      <input
        type="text"
        class="search-input"
        placeholder="Search memories..."
        bind:value={searchQuery}
        oninput={handleSearchInput}
      />
      <select
        class="category-select"
        bind:value={selectedCategory}
        onchange={handleCategoryChange}
      >
        {#each categories as cat}
          <option value={cat.value}>{cat.label}</option>
        {/each}
      </select>
    </div>

    {#if $memories.length === 0}
      <div class="empty-state">
        {#if searchQuery.trim()}
          <p>No memories found for "{searchQuery}".</p>
        {:else}
          <p>No memories stored yet.</p>
          <p class="hint">Lucia will automatically remember important facts, preferences, and decisions from your conversations.</p>
        {/if}
      </div>
    {:else}
      <div class="memory-list">
        {#each $memories as memory}
          <div class="memory-card">
            <div class="card-header">
              <span
                class="category-badge"
                style="color: {categoryColor(memory.category)}; background: color-mix(in srgb, {categoryColor(memory.category)} 12%, transparent)"
              >
                {memory.category}
              </span>
              <span class="card-date">{formatDate(memory.createdAt)}</span>
            </div>

            <p class="card-content">{memory.content}</p>

            <div class="card-footer">
              <span class="access-count">
                {memory.accessCount} {memory.accessCount === 1 ? 'recall' : 'recalls'}
              </span>
              <button
                class="btn btn-sm"
                class:btn-danger={confirmDeleteId === memory.id}
                onclick={() => handleDelete(memory.id)}
              >
                {confirmDeleteId === memory.id ? 'Confirm' : 'Delete'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .memories-page {
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

  .count-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .search-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    color: var(--color-text);
  }

  .search-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .category-select {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    font-size: 0.875rem;
    color: var(--color-text);
    cursor: pointer;
  }

  .category-select:focus {
    border-color: var(--color-primary);
    outline: none;
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

  .hint {
    font-size: 0.8rem;
  }

  .memory-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .memory-card {
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .category-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    text-transform: capitalize;
  }

  .card-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .card-content {
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
    color: var(--color-text);
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.75rem;
  }

  .access-count {
    font-size: 0.7rem;
    color: var(--color-text-muted);
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

  .btn:hover {
    background: var(--color-border);
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
  }

  .btn-danger:hover {
    background: color-mix(in srgb, var(--color-error) 85%, black);
  }
</style>
