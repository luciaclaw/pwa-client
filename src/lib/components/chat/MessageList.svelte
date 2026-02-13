<script lang="ts">
  import type { ChatMessage } from '$lib/types.js';
  import MessageBubble from './MessageBubble.svelte';

  interface Props {
    messages: ChatMessage[];
    streamingContent: string;
    isWaiting?: boolean;
    agentName?: string;
    agentAvatar?: string;
    container?: HTMLDivElement;
  }

  let { messages, streamingContent, isWaiting = false, agentName = 'Lucia', agentAvatar = '', container = $bindable() }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" bind:this={container}>
  {#if messages.length === 0 && !streamingContent && !isWaiting}
    <div class="flex flex-col items-center justify-center h-full text-center gap-2">
      <p class="text-sm text-[var(--theme-text-muted)]">Send a message to start chatting with {agentName}.</p>
      <p class="text-xs text-[var(--theme-text-muted)] opacity-60">All messages are end-to-end encrypted. All inference runs in GPU TEE.</p>
    </div>
  {:else}
    {#each messages as msg (msg.messageId)}
      <MessageBubble message={msg} {agentName} {agentAvatar} />
    {/each}
    {#if streamingContent}
      <MessageBubble
        message={{ messageId: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
        streaming={true}
        {agentName}
        {agentAvatar}
      />
    {:else if isWaiting}
      <div class="flex justify-start">
        <div class="flex items-start gap-2">
          {#if agentAvatar}
            <img src={agentAvatar} alt={agentName} class="w-6 h-6 rounded-full object-cover mt-1 shrink-0" />
          {/if}
          <div class="rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--theme-surface)] border border-[var(--theme-border)]">
            <div class="text-[0.6rem] font-semibold uppercase tracking-wider opacity-60 mb-1 text-[var(--theme-text)]">{agentName}</div>
            <div class="flex items-center gap-1.5 py-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-pulse-dot" style="animation-delay: 0ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-pulse-dot" style="animation-delay: 300ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-pulse-dot" style="animation-delay: 600ms"></span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
