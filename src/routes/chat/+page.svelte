<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { messages, addMessage, clearMessages } from '$lib/stores/chat.js';
  import { wsClient, connectionState, connect } from '$lib/stores/websocket.js';
  import { availableModels, selectedModelId, selectedModel, modelsLoading, setModels, selectModel, providers } from '$lib/stores/models.js';
  import type { ChatMessage, MessageEnvelope, ChatResponsePayload, ChatStreamChunkPayload, ChatStreamEndPayload, ToolConfirmRequestPayload, ModelsResponsePayload } from '$lib/types.js';

  let input = $state('');
  let messagesContainer: HTMLDivElement;
  let streamingContent = $state('');
  let streamingResponseId = $state<string | null>(null);
  let pendingConfirmation = $state<{ callId: string; description: string; risk: string } | null>(null);
  let modelSelectorOpen = $state(false);

  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';

  onMount(() => {
    // Connect to agent CVM
    connect(WS_URL).catch(() => {});

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

  // Fetch models when connection is established
  $effect(() => {
    if ($connectionState === 'encrypted') {
      requestModels();
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
    if (!content) return;

    // Add user message to local store
    const msgId = crypto.randomUUID();
    addMessage({
      messageId: msgId,
      role: 'user',
      content,
      timestamp: Date.now(),
    });

    // Send to agent with selected model
    await wsClient.send({
      id: msgId,
      type: 'chat.message',
      timestamp: Date.now(),
      payload: {
        content,
        model: $selectedModelId || undefined,
      },
    });

    input = '';
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

  function formatPrice(price: number): string {
    if (price === 0) return 'Free';
    if (price < 0.01) return '<$0.01';
    return `$${price.toFixed(2)}`;
  }

  $effect(() => {
    // Auto-scroll when messages change
    if ($messages.length || streamingContent) {
      tick().then(scrollToBottom);
    }
  });
</script>

<div class="chat">
  <div class="chat-header">
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

  <div class="input-bar">
    <textarea
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder={$connectionState === 'encrypted' ? 'Type a message...' : 'Connecting...'}
      disabled={$connectionState !== 'encrypted'}
      rows={1}
    ></textarea>
    <button class="send-btn" onclick={sendMessage} disabled={!input.trim() || $connectionState !== 'encrypted'}>
      Send
    </button>
  </div>
</div>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    height: 100%;
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

  .model-provider {
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.03em;
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
  }

  .btn-approve {
    background: var(--color-success);
    color: white;
  }

  .btn-deny {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .input-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
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
  }

  textarea:focus {
    border-color: var(--color-primary);
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
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
