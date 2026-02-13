<script lang="ts">
  import { PanelLeftOpen, PanelLeftClose, ChevronDown, ChevronUp } from '@lucide/svelte';
  import type { ModelInfo } from '$lib/types.js';

  interface Props {
    sidebarOpen: boolean;
    modelSelectorOpen: boolean;
    selectedModel: ModelInfo | null;
    availableModels: ModelInfo[];
    selectedModelId: string;
    modelsLoading: boolean;
    ontoggleSidebar: () => void;
    ontoggleModelSelector: () => void;
    onselectModel: (modelId: string) => void;
  }

  let {
    sidebarOpen,
    modelSelectorOpen,
    selectedModel,
    availableModels,
    selectedModelId,
    modelsLoading,
    ontoggleSidebar,
    ontoggleModelSelector,
    onselectModel,
  }: Props = $props();

  function formatPrice(price: number): string {
    if (price === 0) return 'Free';
    if (price < 0.01) return '<$0.01';
    return `$${price.toFixed(2)}`;
  }
</script>

<div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/80 backdrop-blur-xl relative">
  <button
    class="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] transition-colors"
    onclick={ontoggleSidebar}
  >
    {#if sidebarOpen}
      <PanelLeftClose size={18} />
    {:else}
      <PanelLeftOpen size={18} />
    {/if}
  </button>

  <button
    class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-xs font-mono text-[var(--theme-text)] hover:border-[var(--theme-primary)] transition-colors max-w-[320px] truncate"
    onclick={ontoggleModelSelector}
    disabled={availableModels.length === 0}
  >
    {#if modelsLoading}
      Loading models...
    {:else if selectedModel}
      {selectedModel.name}
    {:else}
      Select model
    {/if}
    {#if modelSelectorOpen}
      <ChevronUp size={12} class="opacity-50 shrink-0" />
    {:else}
      <ChevronDown size={12} class="opacity-50 shrink-0" />
    {/if}
  </button>

  {#if selectedModel}
    <span class="text-[0.65rem] text-[var(--theme-text-muted)] font-mono hidden sm:inline">
      {selectedModel.contextLength > 0 ? `${Math.round(selectedModel.contextLength / 1000)}K ctx` : ''}
      {selectedModel.inputPrice > 0 ? ` · ${formatPrice(selectedModel.inputPrice)}/${formatPrice(selectedModel.outputPrice)} per 1M` : ''}
    </span>
  {/if}

  {#if modelSelectorOpen}
    <div class="absolute top-full left-0 right-0 z-50 mt-0 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-b-xl shadow-[var(--theme-shadow-lg)] max-h-80 overflow-y-auto">
      {#each availableModels as model (model.id)}
        <button
          class="flex flex-col gap-0.5 w-full px-4 py-2.5 text-left transition-colors
            {model.id === selectedModelId
              ? 'bg-[var(--theme-primary-muted)] border-l-2 border-l-[var(--theme-primary)]'
              : 'hover:bg-[var(--theme-surface-hover)]'}"
          onclick={() => onselectModel(model.id)}
        >
          <span class="text-xs font-mono text-[var(--theme-text)]">{model.name}</span>
          <span class="flex gap-3 text-[0.65rem] text-[var(--theme-text-muted)]">
            {#if model.contextLength > 0}
              <span>{Math.round(model.contextLength / 1000)}K ctx</span>
            {/if}
            {#if model.inputPrice > 0}
              <span>{formatPrice(model.inputPrice)}/{formatPrice(model.outputPrice)} per 1M</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>
