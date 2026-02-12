/**
 * Workflow management store — CRUD operations and WebSocket message handlers.
 */

import { writable } from 'svelte/store';
import type { WorkflowInfo, WorkflowExecutionInfo } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** List of workflows */
export const workflows = writable<WorkflowInfo[]>([]);

/** Active execution status (live updates) */
export const activeExecution = writable<WorkflowExecutionInfo | null>(null);

/** Request the list of workflows from the CVM */
export function requestWorkflows(status?: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'workflow.list',
    timestamp: Date.now(),
    payload: status ? { status } : {},
  });
}

/** Create a new workflow */
export function createWorkflow(
  name: string,
  description: string,
  steps: unknown[],
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'workflow.create',
    timestamp: Date.now(),
    payload: { name, description, steps },
  });
}

/** Update an existing workflow */
export function updateWorkflow(
  workflowId: string,
  updates: Record<string, unknown>,
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'workflow.update',
    timestamp: Date.now(),
    payload: { workflowId, ...updates },
  });
}

/** Delete a workflow */
export function deleteWorkflow(workflowId: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'workflow.delete',
    timestamp: Date.now(),
    payload: { workflowId },
  });
}

/** Execute a workflow */
export function executeWorkflow(
  workflowId: string,
  variables?: Record<string, unknown>,
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'workflow.execute',
    timestamp: Date.now(),
    payload: variables ? { workflowId, variables } : { workflowId },
  });
}

/** Set up message handlers for workflow responses */
export function initWorkflowHandlers(): void {
  wsClient.on('workflow.response', (msg) => {
    const payload = msg.payload as {
      workflows?: WorkflowInfo[];
      execution?: WorkflowExecutionInfo;
    };
    if (payload.workflows) {
      workflows.set(payload.workflows);
    }
    if (payload.execution) {
      activeExecution.set(payload.execution);
    }
  });

  wsClient.on('workflow.status', (msg) => {
    const payload = msg.payload as { execution: WorkflowExecutionInfo };
    activeExecution.set(payload.execution);
  });
}
