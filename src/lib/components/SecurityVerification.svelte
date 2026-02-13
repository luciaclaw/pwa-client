<script lang="ts">
  import { onMount } from 'svelte';
  import { Check } from '@lucide/svelte';
  import type { Component } from 'svelte';

  interface Step {
    icon: Component;
    label: string;
    detail?: string;
  }

  interface Props {
    steps: Step[];
    active: boolean;
    onComplete?: () => void;
    delayPerStep?: number;
    autoDismissDelay?: number;
  }

  let {
    steps,
    active,
    onComplete,
    delayPerStep = 500,
    autoDismissDelay = 800,
  }: Props = $props();

  let currentStep = $state(-1);
  let visible = $state(false);
  let dismissing = $state(false);

  $effect(() => {
    if (active && !visible) {
      visible = true;
      currentStep = -1;
      dismissing = false;
      startAnimation();
    }
  });

  function startAnimation() {
    let step = 0;
    const interval = setInterval(() => {
      currentStep = step;
      step++;
      if (step >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          dismissing = true;
          setTimeout(() => {
            visible = false;
            dismissing = false;
            currentStep = -1;
            onComplete?.();
          }, 300);
        }, autoDismissDelay);
      }
    }, delayPerStep);
  }
</script>

{#if visible}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300
      {dismissing ? 'opacity-0' : 'opacity-100'}"
  >
    <div class="w-full max-w-md mx-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-[var(--theme-shadow-lg)] p-6">
      <div class="flex flex-col gap-3">
        {#each steps as step, i}
          <div
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300
              {i <= currentStep ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}"
            style="transition-delay: {i * 50}ms"
          >
            <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
              {i < currentStep
                ? 'bg-[var(--theme-success-muted)] text-[var(--theme-success)]'
                : i === currentStep
                  ? 'bg-[var(--theme-primary-muted)] text-[var(--theme-primary)]'
                  : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)]'}"
            >
              {#if i < currentStep}
                <Check size={16} />
              {:else if i === currentStep}
                {@const Icon = step.icon}
                <Icon size={16} class={i === currentStep && i === steps.length - 1 ? '' : 'animate-pulse'} />
              {:else}
                {@const Icon = step.icon}
                <Icon size={16} />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--theme-text)]
                {i <= currentStep ? '' : 'opacity-40'}">
                {step.label}
              </p>
              {#if step.detail}
                <p class="text-[0.65rem] font-mono text-[var(--theme-text-muted)] truncate">{step.detail}</p>
              {/if}
            </div>
            <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {#if i < currentStep}
                <Check size={14} class="text-[var(--theme-success)]" />
              {:else if i === currentStep && i < steps.length - 1}
                <span class="w-3 h-3 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></span>
              {:else if i === currentStep && i === steps.length - 1}
                <Check size={14} class="text-[var(--theme-success)]" />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
