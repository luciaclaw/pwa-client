<script lang="ts">
  import { Paperclip, Camera, SendHorizontal, X } from '@lucide/svelte';
  import type { Attachment, AttachmentMimeType } from '$lib/types.js';

  interface Props {
    connected: boolean;
    pendingAttachments: Attachment[];
    onsend: (text: string) => void;
    onattach: (files: FileList | null) => void;
    onremoveattachment: (index: number) => void;
  }

  let { connected, pendingAttachments, onsend, onattach, onremoveattachment }: Props = $props();

  let input = $state('');
  let fileInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;

  const MAX_ATTACHMENTS = 5;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    onsend(text);
    input = '';
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    onattach(target.files);
    target.value = '';
  }

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

<div class="border-t border-[var(--theme-border)] bg-[var(--theme-surface)]">
  {#if pendingAttachments.length > 0}
    <div class="flex gap-2 px-3 pt-2 overflow-x-auto">
      {#each pendingAttachments as att, i}
        <div class="relative flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] min-w-[80px] max-w-[100px]">
          {#if isImage(att.mimeType)}
            <img src={previewUrl(att)} alt={att.filename} class="w-14 h-14 object-cover rounded" />
          {:else}
            <div class="w-14 h-14 flex items-center justify-center rounded bg-[var(--theme-surface-hover)]">
              <span class="text-[0.6rem] font-bold text-[var(--theme-text-muted)]">{att.mimeType === 'application/pdf' ? 'PDF' : 'TXT'}</span>
            </div>
          {/if}
          <span class="text-[0.6rem] text-[var(--theme-text)] truncate w-full text-center">{att.filename}</span>
          <span class="text-[0.55rem] text-[var(--theme-text-muted)]">{formatSize(att.size)}</span>
          <button
            class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--theme-error)] text-white flex items-center justify-center"
            onclick={() => onremoveattachment(i)}
          >
            <X size={10} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex items-end gap-2 px-3 py-2.5">
    <input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain" multiple onchange={handleFileSelect} class="hidden" />
    <input bind:this={cameraInput} type="file" accept="image/*" capture="environment" onchange={handleFileSelect} class="hidden" />

    <div class="flex gap-1">
      <button
        class="p-2 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onclick={() => fileInput.click()}
        disabled={!connected || pendingAttachments.length >= MAX_ATTACHMENTS}
        title="Attach file"
      >
        <Paperclip size={18} />
      </button>
      <button
        class="p-2 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onclick={() => cameraInput.click()}
        disabled={!connected || pendingAttachments.length >= MAX_ATTACHMENTS}
        title="Take photo"
      >
        <Camera size={18} />
      </button>
    </div>

    <textarea
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder={connected ? 'Type a message...' : 'Connecting...'}
      disabled={!connected}
      rows={1}
      class="flex-1 resize-none px-3 py-2 text-sm leading-relaxed rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors min-h-[2.5rem] max-h-32 placeholder:text-[var(--theme-text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
    ></textarea>

    <button
      class="p-2.5 rounded-xl bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      onclick={handleSend}
      disabled={(!input.trim() && pendingAttachments.length === 0) || !connected}
    >
      <SendHorizontal size={18} />
    </button>
  </div>
</div>
