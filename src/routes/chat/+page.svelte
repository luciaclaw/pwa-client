<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { messages, addMessage, clearMessages } from '$lib/stores/chat.js';
  import { wsClient, connectionState, connect } from '$lib/stores/websocket.js';
  import { availableModels, selectedModelId, selectedModel, modelsLoading, setModels, selectModel, providers } from '$lib/stores/models.js';
  import {
    conversations,
    activeConversationId,
    conversationsLoading,
    requestConversations,
    loadConversation,
    startNewConversation,
    deleteConversation,
    initConversationHandlers,
  } from '$lib/stores/conversations.js';
  import type { ChatMessage, MessageEnvelope, ChatResponsePayload, ChatStreamChunkPayload, ChatStreamEndPayload, ToolConfirmRequestPayload, ModelsResponsePayload, Attachment, AttachmentMimeType } from '$lib/types.js';

  const ALLOWED_MIME_TYPES = new Set<string>([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
  ]);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_ATTACHMENTS = 5;

  let input = $state('');
  let messagesContainer: HTMLDivElement;
  let streamingContent = $state('');
  let streamingResponseId = $state<string | null>(null);
  let pendingConfirmation = $state<{ callId: string; description: string; risk: string } | null>(null);
  let modelSelectorOpen = $state(false);
  let sidebarOpen = $state(false);
  let pendingAttachments = $state<Attachment[]>([]);
  let fileInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;

  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';

  onMount(() => {
    // Connect to agent CVM
    connect(WS_URL).catch(() => {});

    // Init conversation handlers
    initConversationHandlers();

    // Listen for agent responses
    wsClient.on('chat.response', (msg: MessageEnvelope) => {
      const payload = msg.payload as ChatResponsePayload;
      addMessage({
        messageId: msg.id,
        role: 'assistant',
        content: payload.content,
        toolCalls: payload.toolCalls,
        timestamp: msg.timestamp,
      });
    });

    // Streaming chunks
    wsClient.on('chat.stream.chunk', (msg: MessageEnvelope) => {
      const payload = msg.payload as ChatStreamChunkPayload;
      streamingResponseId = payload.responseId;
      streamingContent += payload.delta;
    });

    // Stream end
    wsClient.on('chat.stream.end', (msg: MessageEnvelope) => {
      const payload = msg.payload as ChatStreamEndPayload;
      addMessage({
        messageId: payload.responseId,
        role: 'assistant',
        content: payload.content,
        toolCalls: payload.toolCalls,
        timestamp: msg.timestamp,
      });
      streamingContent = '';
      streamingResponseId = null;
    });

    // Models response
    wsClient.on('models.response', (msg: MessageEnvelope) => {
      const payload = msg.payload as ModelsResponsePayload;
      setModels(payload.models, payload.currentModel);
      modelsLoading.set(false);
    });

    // Tool confirmation requests
    wsClient.on('tool.confirm.request', (msg: MessageEnvelope) => {
      const payload = msg.payload as ToolConfirmRequestPayload;
      pendingConfirmation = {
        callId: payload.toolCall.callId,
        description: payload.description,
        risk: payload.risk,
      };
    });
  });

  // Fetch models and conversations when connection is established
  $effect(() => {
    if ($connectionState === 'encrypted') {
      requestModels();
      requestConversations();
    }
  });

  function requestModels() {
    modelsLoading.set(true);
    wsClient.send({
      id: crypto.randomUUID(),
      type: 'models.list',
      timestamp: Date.now(),
      payload: {},
    });
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content && pendingAttachments.length === 0) return;

    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;

    // Add user message to local store
    const msgId = crypto.randomUUID();
    addMessage({
      messageId: msgId,
      role: 'user',
      content: content || '(attached files)',
      attachments,
      timestamp: Date.now(),
    });

    // Send to agent with selected model, conversation ID, and attachments
    await wsClient.send({
      id: msgId,
      type: 'chat.message',
      timestamp: Date.now(),
      payload: {
        content: content || 'Please analyze the attached file(s).',
        model: $selectedModelId || undefined,
        conversationId: $activeConversationId || undefined,
        attachments,
      },
    });

    input = '';
    pendingAttachments = [];
    await tick();
    scrollToBottom();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function respondToConfirmation(approved: boolean) {
    if (!pendingConfirmation) return;
    await wsClient.send({
      id: crypto.randomUUID(),
      type: 'tool.confirm.response',
      timestamp: Date.now(),
      payload: {
        callId: pendingConfirmation.callId,
        approved,
      },
    });
    pendingConfirmation = null;
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleModelSelect(modelId: string) {
    selectModel(modelId);
    modelSelectorOpen = false;
  }

  function handleNewConversation() {
    startNewConversation();
    sidebarOpen = false;
  }

  function handleLoadConversation(id: string) {
    loadConversation(id);
    sidebarOpen = false;
  }

  function handleDeleteConversation(e: Event, id: string) {
    e.stopPropagation();
    deleteConversation(id);
  }

  function formatPrice(price: number): string {
    if (price === 0) return 'Free';
    if (price < 0.01) return '<$0.01';
    return `$${price.toFixed(2)}`;
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URI prefix (data:mime;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (pendingAttachments.length >= MAX_ATTACHMENTS) break;
      if (!ALLOWED_MIME_TYPES.has(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const data = await readFileAsBase64(file);
      pendingAttachments = [...pendingAttachments, {
        filename: file.name,
        mimeType: file.type as AttachmentMimeType,
        data,
        size: file.size,
      }];
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    handleFiles(target.files);
    target.value = '';
  }

  function removeAttachment(index: number) {
    pendingAttachments = pendingAttachments.filter((_, i) => i !== index);
  }

  function isImageAttachment(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  function getAttachmentPreviewUrl(attachment: Attachment): string {
    return `data:${attachment.mimeType};base64,${attachment.data}`;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  $effect(() => {
    // Auto-scroll when messages change
    if ($messages.length || streamingContent) {
      tick().then(scrollToBottom);
    }
  });
</script>

<div class="chat-layout">
  <!-- Conversation sidebar -->
  <div class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <h3>Conversations</h3>
      <button class="new-chat-btn" onclick={handleNewConversation}>+ New</button>
    </div>
    <div class="conversation-list">
      {#if $conversationsLoading}
        <p class="sidebar-placeholder">Loading...</p>
      {:else if $conversations.length === 0}
        <p class="sidebar-placeholder">No conversations yet</p>
      {:else}
        {#each $conversations as conv (conv.id)}
          <div
            class="conversation-item"
            class:active={conv.id === $activeConversationId}
            role="button"
            tabindex="0"
            onclick={() => handleLoadConversation(conv.id)}
            onkeydown={(e) => { if (e.key === 'Enter') handleLoadConversation(conv.id); }}
          >
            <div class="conv-title">{conv.title || 'Untitled'}</div>
            <div class="conv-meta">
              <span>{conv.messageCount} msgs</span>
              <span>{formatTime(conv.updatedAt)}</span>
            </div>
            <button class="conv-delete" onclick={(e) => handleDeleteConversation(e, conv.id)} title="Delete">x</button>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="chat">
    <div class="chat-header">
      <button class="sidebar-toggle" onclick={() => sidebarOpen = !sidebarOpen}>
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>

      <button class="model-selector-btn" onclick={() => modelSelectorOpen = !modelSelectorOpen} disabled={$availableModels.length === 0}>
        {#if $modelsLoading}
          Loading models...
        {:else if $selectedModel}
          {$selectedModel.name}
        {:else}
          Select model
        {/if}
        <span class="chevron">{modelSelectorOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {#if $selectedModel}
        <span class="model-meta">
          {$selectedModel.contextLength > 0 ? `${Math.round($selectedModel.contextLength / 1000)}K ctx` : ''}
          {$selectedModel.inputPrice > 0 ? ` \u00B7 ${formatPrice($selectedModel.inputPrice)}/${formatPrice($selectedModel.outputPrice)} per 1M` : ''}
        </span>
      {/if}
      {#if modelSelectorOpen}
        <div class="model-dropdown">
          <div class="model-list">
            {#each $availableModels as model (model.id)}
              <button
                class="model-option"
                class:selected={model.id === $selectedModelId}
                onclick={() => handleModelSelect(model.id)}
              >
                <div class="model-option-name">{model.name}</div>
                <div class="model-option-meta">
                  {#if model.contextLength > 0}
                    <span>{Math.round(model.contextLength / 1000)}K ctx</span>
                  {/if}
                  {#if model.inputPrice > 0}
                    <span>{formatPrice(model.inputPrice)}/{formatPrice(model.outputPrice)} per 1M</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="messages" bind:this={messagesContainer}>
      {#if $messages.length === 0 && !streamingContent}
        <div class="empty">
          <p>Send a message to start chatting with Lucia.</p>
          <p class="hint">All messages are end-to-end encrypted. All inference runs in GPU TEE.</p>
        </div>
      {:else}
        {#each $messages as msg (msg.messageId)}
          <div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
            <div class="message-role">{msg.role === 'user' ? 'You' : 'Lucia'}</div>
            {#if msg.attachments && msg.attachments.length > 0}
              <div class="message-attachments">
                {#each msg.attachments as att}
                  {#if isImageAttachment(att.mimeType) && att.data !== '[stored]'}
                    <img src={getAttachmentPreviewUrl(att)} alt={att.filename} class="message-image" />
                  {:else}
                    <div class="message-file-badge">
                      {att.filename} ({formatFileSize(att.size)})
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
            <div class="message-content">{msg.content}</div>
          </div>
        {/each}
        {#if streamingContent}
          <div class="message assistant">
            <div class="message-role">Lucia</div>
            <div class="message-content streaming">{streamingContent}<span class="cursor">|</span></div>
          </div>
        {/if}
      {/if}
    </div>

    {#if pendingConfirmation}
      <div class="confirmation">
        <div class="confirmation-content">
          <p class="confirmation-label">Action requires approval</p>
          <p class="confirmation-description">{pendingConfirmation.description}</p>
          <span class="risk-badge" class:high={pendingConfirmation.risk === 'high'} class:medium={pendingConfirmation.risk === 'medium'}>
            {pendingConfirmation.risk} risk
          </span>
          <div class="confirmation-actions">
            <button class="btn-approve" onclick={() => respondToConfirmation(true)}>Approve</button>
            <button class="btn-deny" onclick={() => respondToConfirmation(false)}>Deny</button>
          </div>
        </div>
      </div>
    {/if}

    <div class="input-area">
      {#if pendingAttachments.length > 0}
        <div class="attachment-previews">
          {#each pendingAttachments as attachment, i}
            <div class="attachment-preview">
              {#if isImageAttachment(attachment.mimeType)}
                <img src={getAttachmentPreviewUrl(attachment)} alt={attachment.filename} class="preview-thumb" />
              {:else}
                <div class="preview-file">
                  <span class="file-icon">{attachment.mimeType === 'application/pdf' ? 'PDF' : 'TXT'}</span>
                </div>
              {/if}
              <span class="preview-name">{attachment.filename}</span>
              <span class="preview-size">{formatFileSize(attachment.size)}</span>
              <button class="preview-remove" onclick={() => removeAttachment(i)} title="Remove">x</button>
            </div>
          {/each}
        </div>
      {/if}

      <div class="input-bar">
        <input
          bind:this={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain"
          multiple
          onchange={handleFileSelect}
          class="hidden-input"
        />
        <input
          bind:this={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          onchange={handleFileSelect}
          class="hidden-input"
        />

        <div class="attach-buttons">
          <button
            class="attach-btn"
            onclick={() => fileInput.click()}
            disabled={$connectionState !== 'encrypted' || pendingAttachments.length >= MAX_ATTACHMENTS}
            title="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button
            class="attach-btn"
            onclick={() => cameraInput.click()}
            disabled={$connectionState !== 'encrypted' || pendingAttachments.length >= MAX_ATTACHMENTS}
            title="Take photo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        <textarea
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder={$connectionState === 'encrypted' ? 'Type a message...' : 'Connecting...'}
          disabled={$connectionState !== 'encrypted'}
          rows={1}
        ></textarea>
        <button class="send-btn" onclick={sendMessage} disabled={(!input.trim() && pendingAttachments.length === 0) || $connectionState !== 'encrypted'}>
          Send
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .chat-layout {
    display: flex;
    height: 100%;
  }

  .sidebar {
    width: 0;
    overflow: hidden;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    transition: width 0.2s ease;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .sidebar.open {
    width: 280px;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-header h3 {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0;
  }

  .new-chat-btn {
    padding: 0.3rem 0.6rem;
    border-radius: var(--radius);
    background: var(--color-primary);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }

  .conversation-list {
    flex: 1;
    overflow-y: auto;
  }

  .sidebar-placeholder {
    padding: 1rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-align: center;
  }

  .conversation-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.6rem 1rem;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    position: relative;
    color: var(--color-text);
  }

  .conversation-item:hover {
    background: var(--color-surface-hover);
  }

  .conversation-item.active {
    background: rgba(99, 102, 241, 0.1);
    border-left: 3px solid var(--color-primary);
  }

  .conv-title {
    font-size: 0.8rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 1.5rem;
  }

  .conv-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .conv-delete {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-size: 0.7rem;
    background: transparent;
    color: var(--color-text-muted);
    border: none;
    cursor: pointer;
    opacity: 0;
  }

  .conversation-item:hover .conv-delete {
    opacity: 1;
  }

  .conv-delete:hover {
    background: var(--color-error);
    color: white;
  }

  .chat {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .chat-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    position: relative;
  }

  .sidebar-toggle {
    padding: 0.3rem 0.5rem;
    border-radius: var(--radius);
    background: transparent;
    border: 1px solid var(--color-border);
    font-size: 1rem;
    cursor: pointer;
    color: var(--color-text);
    line-height: 1;
  }

  .sidebar-toggle:hover {
    background: var(--color-surface-hover);
  }

  .model-selector-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.8rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    transition: border-color 0.15s;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .model-selector-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
  }

  .model-selector-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chevron {
    font-size: 0.6rem;
    opacity: 0.6;
  }

  .model-meta {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .model-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: none;
    max-height: 400px;
    overflow-y: auto;
  }

  .model-list {
    display: flex;
    flex-direction: column;
  }

  .model-option {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 1rem;
    text-align: left;
    transition: background 0.1s;
    border-bottom: 1px solid var(--color-border);
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--color-text);
    width: 100%;
  }

  .model-option:hover {
    background: var(--color-surface-hover);
  }

  .model-option.selected {
    background: rgba(99, 102, 241, 0.1);
    border-left: 3px solid var(--color-primary);
  }

  .model-option-name {
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  .model-option-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    text-align: center;
    gap: 0.5rem;
  }

  .hint {
    font-size: 0.8rem;
    opacity: 0.6;
  }

  .message {
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    line-height: 1.5;
  }

  .message.user {
    align-self: flex-end;
    background: var(--color-primary);
    color: white;
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .message-role {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
    margin-bottom: 0.25rem;
  }

  .message-content {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.9rem;
  }

  .streaming .cursor {
    animation: blink 0.7s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .confirmation {
    padding: 1rem;
    background: rgba(245, 158, 11, 0.1);
    border-top: 1px solid var(--color-warning);
  }

  .confirmation-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .confirmation-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-warning);
    margin-bottom: 0.25rem;
  }

  .confirmation-description {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .risk-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius);
    background: var(--color-surface);
    margin-bottom: 0.75rem;
  }

  .risk-badge.high {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-error);
  }

  .risk-badge.medium {
    background: rgba(245, 158, 11, 0.2);
    color: var(--color-warning);
  }

  .confirmation-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-approve, .btn-deny {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }

  .btn-approve {
    background: var(--color-success);
    color: white;
  }

  .btn-deny {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .input-area {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .hidden-input {
    display: none;
  }

  .attachment-previews {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem 0;
    overflow-x: auto;
  }

  .attachment-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.4rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    position: relative;
    min-width: 80px;
    max-width: 100px;
  }

  .preview-thumb {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 4px;
  }

  .preview-file {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-hover);
    border-radius: 4px;
  }

  .file-icon {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text-muted);
  }

  .preview-name {
    font-size: 0.65rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    text-align: center;
    color: var(--color-text);
  }

  .preview-size {
    font-size: 0.6rem;
    color: var(--color-text-muted);
  }

  .preview-remove {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-error);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .attach-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .attach-btn {
    padding: 0.4rem;
    border-radius: var(--radius);
    background: transparent;
    border: 1px solid var(--color-border);
    cursor: pointer;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .attach-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-primary);
  }

  .attach-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .message-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .message-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: 4px;
    object-fit: cover;
  }

  .message-file-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.15);
  }

  .message.assistant .message-file-badge {
    background: var(--color-surface-hover);
  }

  .input-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: 0.9rem;
    line-height: 1.5;
    min-height: 2.5rem;
    max-height: 8rem;
    color: var(--color-text);
    font-family: inherit;
  }

  textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .send-btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    transition: background 0.15s;
    border: none;
    cursor: pointer;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
