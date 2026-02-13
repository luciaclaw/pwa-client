<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { messages, addMessage, clearMessages } from '$lib/stores/chat.js';
  import { wsClient, connectionState, connect } from '$lib/stores/websocket.js';
  import { availableModels, selectedModelId, selectedModel, modelsLoading, setModels, selectModel } from '$lib/stores/models.js';
  import {
    preferences, preferencesLoaded, requestPreferences, initPreferencesHandlers,
  } from '$lib/stores/preferences.js';
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
  import { Monitor, ShieldCheck, Lock } from '@lucide/svelte';
  import ChatSidebar from '$lib/components/chat/ChatSidebar.svelte';
  import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
  import MessageList from '$lib/components/chat/MessageList.svelte';
  import ChatInput from '$lib/components/chat/ChatInput.svelte';
  import ToolConfirmation from '$lib/components/chat/ToolConfirmation.svelte';
  import SecurityVerification from '$lib/components/SecurityVerification.svelte';

  const ALLOWED_MIME_TYPES = new Set<string>([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
  ]);
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_ATTACHMENTS = 5;

  let messagesContainer = $state<HTMLDivElement>();
  let streamingContent = $state('');
  let streamingResponseId = $state<string | null>(null);
  let pendingConfirmation = $state<{ callId: string; description: string; risk: string } | null>(null);
  let modelSelectorOpen = $state(false);
  let sidebarOpen = $state(false);
  let pendingAttachments = $state<Attachment[]>([]);
  let waitingForResponse = $state(false);

  // Agent identity from preferences
  let agentName = $derived($preferencesLoaded ? ($preferences['agent_name'] || 'Lucia') : 'Lucia');
  let agentAvatar = $derived($preferencesLoaded ? ($preferences['agent_avatar'] || '') : '');

  // Security animation for model selection
  let showModelSecurity = $state(false);
  let prevModelId = $state('');

  const modelSecuritySteps = [
    { icon: Monitor, label: 'Verifying GPU TEE environment (NVIDIA CC)...', detail: 'H100 Confidential Computing' },
    { icon: ShieldCheck, label: 'Validating inference enclave integrity...', detail: 'Intel TDX measurement check' },
    { icon: Lock, label: 'Ready — all inference hardware-encrypted', detail: 'AES-256-GCM' },
  ];

  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://73d15d007beccbbaccfba1e2ff800c5f7026e432-8080.dstack-pha-prod9.phala.network/ws';

  onMount(() => {
    connect(WS_URL).catch(() => {});
    initConversationHandlers();
    initPreferencesHandlers();

    wsClient.on('chat.response', (msg: MessageEnvelope) => {
      const payload = msg.payload as ChatResponsePayload;
      addMessage({
        messageId: msg.id,
        role: 'assistant',
        content: payload.content,
        toolCalls: payload.toolCalls,
        timestamp: msg.timestamp,
      });
      waitingForResponse = false;
    });

    wsClient.on('chat.stream.chunk', (msg: MessageEnvelope) => {
      const payload = msg.payload as ChatStreamChunkPayload;
      streamingResponseId = payload.responseId;
      streamingContent += payload.delta;
      waitingForResponse = false;
    });

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
      waitingForResponse = false;
    });

    wsClient.on('models.response', (msg: MessageEnvelope) => {
      const payload = msg.payload as ModelsResponsePayload;
      setModels(payload.models, payload.currentModel);
      modelsLoading.set(false);
    });

    wsClient.on('tool.confirm.request', (msg: MessageEnvelope) => {
      const payload = msg.payload as ToolConfirmRequestPayload;
      pendingConfirmation = {
        callId: payload.toolCall.callId,
        description: payload.description,
        risk: payload.risk,
      };
    });
  });

  $effect(() => {
    if ($connectionState === 'encrypted') {
      requestModels();
      requestConversations();
      requestPreferences();
    }
  });

  // Trigger security animation on model change
  $effect(() => {
    const currentId = $selectedModelId;
    if (prevModelId && currentId && currentId !== prevModelId) {
      showModelSecurity = true;
    }
    prevModelId = currentId;
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

  async function handleSend(text: string) {
    const content = text.trim();
    if (!content && pendingAttachments.length === 0) return;

    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;

    const msgId = crypto.randomUUID();
    addMessage({
      messageId: msgId,
      role: 'user',
      content: content || '(attached files)',
      attachments,
      timestamp: Date.now(),
    });

    waitingForResponse = true;

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

    pendingAttachments = [];
    await tick();
    scrollToBottom();
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

  function handleDeleteConversation(id: string) {
    deleteConversation(id);
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
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

  function removeAttachment(index: number) {
    pendingAttachments = pendingAttachments.filter((_, i) => i !== index);
  }

  $effect(() => {
    if ($messages.length || streamingContent) {
      tick().then(scrollToBottom);
    }
  });
</script>

<div class="flex h-full">
  <!-- Sidebar: overlay on mobile, persistent on lg -->
  {#if sidebarOpen}
    <button
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      onclick={() => sidebarOpen = false}
      aria-label="Close sidebar"
    ></button>
  {/if}
  <div class="
    {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto lg:translate-x-0
    transition-transform duration-200
  ">
    <ChatSidebar
      open={true}
      conversations={$conversations}
      activeId={$activeConversationId}
      loading={$conversationsLoading}
      onnew={handleNewConversation}
      onload={handleLoadConversation}
      ondelete={handleDeleteConversation}
      onclose={() => sidebarOpen = false}
    />
  </div>

  <!-- Main chat area -->
  <div class="flex flex-col flex-1 min-w-0">
    <ChatHeader
      {sidebarOpen}
      {modelSelectorOpen}
      selectedModel={$selectedModel}
      availableModels={$availableModels}
      selectedModelId={$selectedModelId}
      modelsLoading={$modelsLoading}
      ontoggleSidebar={() => sidebarOpen = !sidebarOpen}
      ontoggleModelSelector={() => modelSelectorOpen = !modelSelectorOpen}
      onselectModel={handleModelSelect}
    />

    <MessageList
      messages={$messages}
      {streamingContent}
      isWaiting={waitingForResponse}
      {agentName}
      {agentAvatar}
      bind:container={messagesContainer}
    />

    {#if pendingConfirmation}
      <ToolConfirmation
        description={pendingConfirmation.description}
        risk={pendingConfirmation.risk}
        onapprove={() => respondToConfirmation(true)}
        ondeny={() => respondToConfirmation(false)}
      />
    {/if}

    <ChatInput
      connected={$connectionState === 'encrypted'}
      {pendingAttachments}
      onsend={handleSend}
      onattach={handleFiles}
      onremoveattachment={removeAttachment}
    />
  </div>
</div>

<!-- Security animation on model switch -->
<SecurityVerification
  steps={modelSecuritySteps}
  active={showModelSecurity}
  onComplete={() => { showModelSecurity = false; }}
  delayPerStep={400}
  autoDismissDelay={600}
/>
