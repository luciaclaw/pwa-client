import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('onboarding store', () => {
  beforeEach(() => {
    storage.clear();
    // Force re-import with fresh state
    vi.resetModules();
  });

  it('starts with welcome step when no saved state', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    const unsub = mod.currentStep.subscribe((v) => { step = v; });
    expect(step).toBe('welcome');
    unsub();
  });

  it('starts as not completed', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let completed = true;
    const unsub = mod.onboardingCompleted.subscribe((v) => { completed = v; });
    expect(completed).toBe(false);
    unsub();
  });

  it('needsOnboarding is true when not completed', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let needs = false;
    const unsub = mod.needsOnboarding.subscribe((v) => { needs = v; });
    expect(needs).toBe(true);
    unsub();
  });

  it('advances to next step', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    const unsub = mod.currentStep.subscribe((v) => { step = v; });

    mod.nextStep();
    expect(step).toBe('connect');

    mod.nextStep();
    expect(step).toBe('personality');

    mod.nextStep();
    expect(step).toBe('integrations');

    mod.nextStep();
    expect(step).toBe('complete');

    // Should not go past complete
    mod.nextStep();
    expect(step).toBe('complete');

    unsub();
  });

  it('goes back to previous step', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    const unsub = mod.currentStep.subscribe((v) => { step = v; });

    mod.nextStep(); // connect
    mod.nextStep(); // personality
    mod.prevStep(); // connect
    expect(step).toBe('connect');

    mod.prevStep(); // welcome
    expect(step).toBe('welcome');

    // Should not go before welcome
    mod.prevStep();
    expect(step).toBe('welcome');

    unsub();
  });

  it('skips step and records it', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    let skipped: string[] = [];
    const unsub1 = mod.currentStep.subscribe((v) => { step = v; });
    const unsub2 = mod.skippedSteps.subscribe((v) => { skipped = v; });

    mod.nextStep(); // connect
    mod.nextStep(); // personality
    mod.skipStep(); // skip personality, go to integrations
    expect(step).toBe('integrations');
    expect(skipped).toContain('personality');

    unsub1();
    unsub2();
  });

  it('jumps to specific step', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    const unsub = mod.currentStep.subscribe((v) => { step = v; });

    mod.goToStep('integrations');
    expect(step).toBe('integrations');

    mod.goToStep('welcome');
    expect(step).toBe('welcome');

    unsub();
  });

  it('completes onboarding', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let completed = false;
    let needs = true;
    const unsub1 = mod.onboardingCompleted.subscribe((v) => { completed = v; });
    const unsub2 = mod.needsOnboarding.subscribe((v) => { needs = v; });

    mod.completeOnboarding();
    expect(completed).toBe(true);
    expect(needs).toBe(false);

    unsub1();
    unsub2();
  });

  it('persists state to localStorage', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    mod.nextStep(); // connect
    mod.nextStep(); // personality

    const saved = JSON.parse(storage.get('lucia_onboarding')!);
    expect(saved.currentStep).toBe('personality');
    expect(saved.completed).toBe(false);
  });

  it('restores state from localStorage', async () => {
    storage.set('lucia_onboarding', JSON.stringify({
      completed: false,
      currentStep: 'integrations',
      skippedSteps: ['personality'],
    }));

    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    let skipped: string[] = [];
    const unsub1 = mod.currentStep.subscribe((v) => { step = v; });
    const unsub2 = mod.skippedSteps.subscribe((v) => { skipped = v; });

    expect(step).toBe('integrations');
    expect(skipped).toContain('personality');

    unsub1();
    unsub2();
  });

  it('restores completed state from localStorage', async () => {
    storage.set('lucia_onboarding', JSON.stringify({
      completed: true,
      currentStep: 'complete',
      skippedSteps: [],
    }));

    const mod = await import('../src/lib/stores/onboarding.js');
    let completed = false;
    const unsub = mod.onboardingCompleted.subscribe((v) => { completed = v; });
    expect(completed).toBe(true);
    unsub();
  });

  it('resets onboarding', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    mod.completeOnboarding();
    mod.goToStep('complete');

    mod.resetOnboarding();

    let completed = true;
    let step = '';
    let skipped: string[] = [];
    const unsub1 = mod.onboardingCompleted.subscribe((v) => { completed = v; });
    const unsub2 = mod.currentStep.subscribe((v) => { step = v; });
    const unsub3 = mod.skippedSteps.subscribe((v) => { skipped = v; });

    expect(completed).toBe(false);
    expect(step).toBe('welcome');
    expect(skipped).toEqual([]);

    unsub1();
    unsub2();
    unsub3();
  });

  it('exposes correct step index', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    let idx = -1;
    const unsub = mod.stepIndex.subscribe((v) => { idx = v; });

    expect(idx).toBe(0); // welcome
    mod.nextStep();
    expect(idx).toBe(1); // connect
    mod.nextStep();
    expect(idx).toBe(2); // personality
    mod.nextStep();
    expect(idx).toBe(3); // integrations
    mod.nextStep();
    expect(idx).toBe(4); // complete

    unsub();
  });

  it('has correct total steps', async () => {
    const mod = await import('../src/lib/stores/onboarding.js');
    expect(mod.totalSteps).toBe(5);
  });

  it('handles corrupt localStorage gracefully', async () => {
    storage.set('lucia_onboarding', 'not-valid-json');

    const mod = await import('../src/lib/stores/onboarding.js');
    let step = '';
    const unsub = mod.currentStep.subscribe((v) => { step = v; });
    expect(step).toBe('welcome');
    unsub();
  });
});
