/**
 * Models store — available LLM models from Phala Confidential AI.
 */

import { writable, derived } from 'svelte/store';
import type { ModelInfo } from '@luciaclaw/protocol';

export const availableModels = writable<ModelInfo[]>([]);
export const selectedModelId = writable<string>('');
export const modelsLoading = writable<boolean>(false);

export const selectedModel = derived(
  [availableModels, selectedModelId],
  ([$models, $id]) => $models.find((m) => m.id === $id) || null
);

/** Unique providers from available models */
export const providers = derived(availableModels, ($models) =>
  [...new Set($models.map((m) => m.provider))].sort()
);

export function setModels(models: ModelInfo[], currentModel: string): void {
  availableModels.set(models);
  if (currentModel) {
    selectedModelId.set(currentModel);
  } else if (models.length > 0) {
    selectedModelId.set(models[0].id);
  }
}

export function selectModel(modelId: string): void {
  selectedModelId.set(modelId);
}
