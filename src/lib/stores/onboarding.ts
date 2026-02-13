/**
 * Onboarding wizard state — persisted in localStorage.
 */

import { writable, derived } from 'svelte/store';

export type OnboardingStep = 'welcome' | 'connect' | 'personality' | 'integrations' | 'complete';

const STEPS: OnboardingStep[] = ['welcome', 'connect', 'personality', 'integrations', 'complete'];

const STORAGE_KEY = 'lucia_onboarding';

interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  skippedSteps: OnboardingStep[];
}

function loadState(): OnboardingState {
  if (typeof localStorage === 'undefined') {
    return { completed: false, currentStep: 'welcome', skippedSteps: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt data — reset
  }
  return { completed: false, currentStep: 'welcome', skippedSteps: [] };
}

function saveState(state: OnboardingState): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

const initial = loadState();

export const onboardingCompleted = writable(initial.completed);
export const currentStep = writable<OnboardingStep>(initial.currentStep);
export const skippedSteps = writable<OnboardingStep[]>(initial.skippedSteps);

/** Whether the user still needs to complete onboarding */
export const needsOnboarding = derived(onboardingCompleted, ($c) => !$c);

/** Current step index (0-based) */
export const stepIndex = derived(currentStep, ($s) => STEPS.indexOf($s));

/** Total number of steps */
export const totalSteps = STEPS.length;

/** All ordered steps */
export const allSteps = STEPS;

/** Go to the next step */
export function nextStep(): void {
  currentStep.update((s) => {
    const idx = STEPS.indexOf(s);
    const next = idx < STEPS.length - 1 ? STEPS[idx + 1] : s;
    return next;
  });
  persist();
}

/** Go to the previous step */
export function prevStep(): void {
  currentStep.update((s) => {
    const idx = STEPS.indexOf(s);
    const prev = idx > 0 ? STEPS[idx - 1] : s;
    return prev;
  });
  persist();
}

/** Jump to a specific step */
export function goToStep(step: OnboardingStep): void {
  currentStep.set(step);
  persist();
}

/** Mark the current step as skipped and advance */
export function skipStep(): void {
  currentStep.update((s) => {
    skippedSteps.update((ss) => {
      if (!ss.includes(s)) ss.push(s);
      return ss;
    });
    const idx = STEPS.indexOf(s);
    return idx < STEPS.length - 1 ? STEPS[idx + 1] : s;
  });
  persist();
}

/** Mark onboarding as complete */
export function completeOnboarding(): void {
  onboardingCompleted.set(true);
  persist();
}

/** Reset onboarding (for testing or re-onboarding) */
export function resetOnboarding(): void {
  onboardingCompleted.set(false);
  currentStep.set('welcome');
  skippedSteps.set([]);
  persist();
}

function persist(): void {
  let state: OnboardingState;
  const unsubs: Array<() => void> = [];

  let c = false, s: OnboardingStep = 'welcome', sk: OnboardingStep[] = [];
  unsubs.push(onboardingCompleted.subscribe((v) => { c = v; }));
  unsubs.push(currentStep.subscribe((v) => { s = v; }));
  unsubs.push(skippedSteps.subscribe((v) => { sk = v; }));
  unsubs.forEach((u) => u());

  state = { completed: c, currentStep: s, skippedSteps: sk };
  saveState(state);
}
