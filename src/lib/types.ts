/**
 * Re-export protocol types for convenience.
 */
export type {
  MessageEnvelope,
  EncryptedEnvelope,
  MessageType,
  ChatMessage,
  ChatRole,
  ChatMessagePayload,
  ChatResponsePayload,
  ChatStreamChunkPayload,
  ChatStreamEndPayload,
  Attachment,
  AttachmentMimeType,
  ToolCallPayload,
  ToolResultPayload,
  ToolConfirmRequestPayload,
  ToolConfirmResponsePayload,
  ConfirmationRisk,
  AttestationReport,
  ErrorPayload,
  ModelInfo,
  ModelsListPayload,
  ModelsResponsePayload,
} from '@luciaclaw/protocol';

export { ErrorCode, PROTOCOL_VERSION } from '@luciaclaw/protocol';
