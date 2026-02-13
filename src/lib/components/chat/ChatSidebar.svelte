<script lang="ts">
  import { MessageSquarePlus, X, Trash2 } from '@lucide/svelte';
  import type { ConversationSummary } from '@luciaclaw/protocol';
  import Button from '../Button.svelte';

  interface Props {
    open: boolean;
    conversations: ConversationSummary[];
    activeId: string | null;
    loading: boolean;
    onnew: () => void;
    onload: (id: string) => void;
    ondelete: (id: string) => void;
    onclose: () => void;
  }

  let { open, conversations, activeId, loading, onnew, onload, ondelete, onclose }: Props = $props();

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div
  class="flex flex-col bg-[var(--theme-surface)] border-r border-[var(--theme-border)] transition-all duration-200 shrink-0 overflow-hidden
    {open ? 'w-72' : 'w-0'}"
>
  <div class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--theme-border)]">
    <span class="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Conversations</span>
    <div class="flex items-center gap-1">
      <button class="p-1 rounded-lg text-[var(--theme-primary)] hover:bg-[var(--theme-primary-muted)] transition-colors" onclick={onnew} title="New chat">
        <MessageSquarePlus size={16} />
      </button>
      <button class="p-1 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] transition-colors lg:hidden" onclick={onclose}>
        <X size={16} />
      </button>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <p class="p-4 text-xs text-[var(--theme-text-muted)] text-center">Loading...</p>
    {:else if conversations.length === 0}
      <p class="p-4 text-xs text-[var(--theme-text-muted)] text-center">No conversations yet</p>
    {:else}
      {#each conversations as conv (conv.id)}
        <div
          class="flex flex-col gap-0.5 w-full px-3 py-2.5 text-left border-b border-[var(--theme-border)] transition-colors duration-100 group relative cursor-pointer
            {conv.id === activeId
              ? 'bg-[var(--theme-primary-muted)] border-l-2 border-l-[var(--theme-primary)]'
              : 'hover:bg-[var(--theme-surface-hover)]'}"
          role="button"
          tabindex="0"
          onclick={() => onload(conv.id)}
          onkeydown={(e) => { if (e.key === 'Enter') onload(conv.id); }}
        >
          <span class="text-xs font-medium text-[var(--theme-text)] truncate pr-6">{conv.title || 'Untitled'}</span>
          <span class="flex gap-2 text-[0.65rem] text-[var(--theme-text-muted)]">
            <span>{conv.messageCount} msgs</span>
            <span>{formatTime(conv.updatedAt)}</span>
          </span>
          <button
            class="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--theme-text-muted)] hover:bg-[var(--theme-error)] hover:text-white transition-all"
            onclick={(e) => { e.stopPropagation(); ondelete(conv.id); }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
