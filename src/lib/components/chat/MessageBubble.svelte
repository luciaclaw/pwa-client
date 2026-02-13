<script lang="ts">
  import type { ChatMessage, Attachment } from '$lib/types.js';

  interface Props {
    message: ChatMessage;
    streaming?: boolean;
    agentName?: string;
    agentAvatar?: string;
  }

  let { message, streaming = false, agentName = 'Lucia', agentAvatar = '' }: Props = $props();

  function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  function previewUrl(att: Attachment): string {
    return `data:${att.mimeType};base64,${att.data}`;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
  <div class="flex items-start gap-2 {message.role === 'user' ? 'flex-row-reverse' : ''}">
    {#if message.role === 'assistant' && agentAvatar}
      <img src={agentAvatar} alt={agentName} class="w-6 h-6 rounded-full object-cover mt-1 shrink-0" />
    {/if}
    <div
      class="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        {message.role === 'user'
          ? 'bg-[var(--theme-primary)] text-white rounded-br-md'
          : 'bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-bl-md text-[var(--theme-text)]'}"
    >
    <div class="text-[0.6rem] font-semibold uppercase tracking-wider opacity-60 mb-1">
      {message.role === 'user' ? 'You' : agentName}
    </div>

    {#if message.attachments && message.attachments.length > 0}
      <div class="flex flex-wrap gap-2 mb-2">
        {#each message.attachments as att}
          {#if isImage(att.mimeType) && att.data !== '[stored]'}
            <img src={previewUrl(att)} alt={att.filename} class="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
          {:else}
            <span class="inline-block px-2 py-1 text-xs rounded-md
              {message.role === 'user' ? 'bg-white/15' : 'bg-[var(--theme-surface-hover)]'}">
              {att.filename} ({formatSize(att.size)})
            </span>
          {/if}
        {/each}
      </div>
    {/if}

    <div class="whitespace-pre-wrap break-words">
      {message.content}{#if streaming}<span class="inline-block w-0.5 h-4 bg-current ml-0.5 animate-[blink_0.7s_infinite]"></span>{/if}
    </div>
    </div>
  </div>
</div>
