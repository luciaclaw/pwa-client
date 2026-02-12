/**
 * Schedule management store — CRUD operations and WebSocket message handlers.
 */

import { writable, derived } from 'svelte/store';
import type { ScheduleInfo, ScheduleExecutedPayload } from '@luciaclaw/protocol';
import { wsClient } from './websocket.js';

/** List of scheduled tasks */
export const schedules = writable<ScheduleInfo[]>([]);

/** Most recent schedule execution (for toast notification) */
export const lastExecution = writable<ScheduleExecutedPayload | null>(null);

/** Count of active schedules */
export const activeCount = derived(schedules, ($s) => $s.filter((s) => s.status === 'active').length);

/** Request the list of schedules from the CVM */
export function requestSchedules(): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'schedule.list',
    timestamp: Date.now(),
    payload: {},
  });
}

/** Create a new scheduled task */
export function createSchedule(
  name: string,
  cronExpression: string,
  timezone: string,
  prompt: string
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'schedule.create',
    timestamp: Date.now(),
    payload: { name, cronExpression, timezone, prompt },
  });
}

/** Update an existing scheduled task */
export function updateSchedule(
  scheduleId: string,
  updates: {
    name?: string;
    cronExpression?: string;
    timezone?: string;
    prompt?: string;
    status?: 'active' | 'paused';
  }
): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'schedule.update',
    timestamp: Date.now(),
    payload: { scheduleId, ...updates },
  });
}

/** Delete a scheduled task */
export function deleteSchedule(scheduleId: string): void {
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'schedule.delete',
    timestamp: Date.now(),
    payload: { scheduleId },
  });
}

/** Toggle a schedule between active and paused */
export function toggleSchedule(scheduleId: string, currentStatus: 'active' | 'paused'): void {
  updateSchedule(scheduleId, {
    status: currentStatus === 'active' ? 'paused' : 'active',
  });
}

/** Set up message handlers for schedule responses */
export function initScheduleHandlers(): void {
  wsClient.on('schedule.response', (msg) => {
    const payload = msg.payload as { schedules: ScheduleInfo[] };
    schedules.set(payload.schedules);
  });

  wsClient.on('schedule.executed', (msg) => {
    const payload = msg.payload as ScheduleExecutedPayload;
    lastExecution.set(payload);
    // Auto-clear the execution toast after 10 seconds
    setTimeout(() => {
      lastExecution.set(null);
    }, 10_000);
    // Refresh the schedule list to update lastRunAt/nextRunAt
    requestSchedules();
  });
}
