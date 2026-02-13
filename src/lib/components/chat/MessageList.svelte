<script lang="ts">
  import type { ChatMessage } from '$lib/types.js';
  import MessageBubble from './MessageBubble.svelte';

  interface Props {
    messages: ChatMessage[];
    streamingContent: string;
    container?: HTMLDivElement;
  }

  let { messages, streamingContent, container = $bindable() }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" bind:this={container}>
  {#if messages.length === 0 && !streamingContent}
    <div class="flex flex-col items-center justify-center h-full text-center gap-2">
      <p class="text-sm text-[var(--theme-text-muted)]">Send a message to start chatting with Lucia.</p>
      <p class="text-xs text-[var(--theme-text-muted)] opacity-60">All messages are end-to-end encrypted. All inference runs in GPU TEE.</p>
    </div>
  {:else}
    {#each messages as msg (msg.messageId)}
      <MessageBubble message={msg} />
    {/each}
    {#if streamingContent}
      <MessageBubble
        message={{ messageId: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
        streaming={true}
      />
    {/if}
  {/if}
</div>
