<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import type { CredentialInfo } from '@luciaclaw/protocol';

  interface Integration {
    service: string;
    name: string;
    description: string;
    authType: 'oauth' | 'api_key';
    connected: boolean;
    capabilities: string[];
    requiredScopes?: string[];
  }

  interface Props {
    integration: Integration;
    credentials?: CredentialInfo[];
    oauthLoading?: boolean;
    apiKeyValue?: string;
    onconnect?: (service: string, scopes: string[], account?: string) => void;
    ondisconnect?: (service: string, account?: string) => void;
    onapikey?: (service: string, name: string) => void;
    onapikeyinput?: (value: string) => void;
    onconnectanother?: (service: string, scopes: string[]) => void;
    compact?: boolean;
  }

  let {
    integration,
    credentials = [],
    oauthLoading = false,
    apiKeyValue = '',
    onconnect,
    ondisconnect,
    onapikey,
    onapikeyinput,
    onconnectanother,
    compact = false,
  }: Props = $props();
</script>

<div
  class="rounded-xl border bg-[var(--theme-bg)] transition-colors duration-150
    {integration.connected ? 'border-[var(--theme-success)]' : 'border-[var(--theme-border)]'}
    {compact ? 'p-3' : 'p-4'}"
>
  <div class="flex items-start justify-between mb-2">
    <div class="flex flex-col gap-0.5">
      <span class="font-semibold text-sm text-[var(--theme-text)]">{integration.name}</span>
      <span class="text-xs text-[var(--theme-text-muted)]">{integration.description}</span>
    </div>
    <Badge variant={integration.connected ? 'success' : 'neutral'}>
      {integration.connected ? (credentials.length > 1 ? `${credentials.length} accounts` : 'Connected') : 'Not connected'}
    </Badge>
  </div>

  {#if !compact}
    <div class="flex flex-wrap gap-1.5 mb-3">
      {#each integration.capabilities.slice(0, 4) as cap}
        <span class="px-2 py-0.5 text-[0.65rem] font-mono rounded bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)]">{cap}</span>
      {/each}
    </div>
  {/if}

  {#if credentials.length > 0 && !compact}
    <div class="flex flex-col gap-1.5 mb-3 p-2.5 rounded-lg bg-[var(--theme-surface)]">
      {#each credentials as cred}
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-mono text-[var(--theme-text)]">{cred.label}{cred.account ? ` (${cred.account})` : ''}</span>
          {#if ondisconnect}
            <Button variant="danger" size="sm" onclick={() => ondisconnect(cred.service, cred.account)}>Disconnect</Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex gap-2">
    {#if integration.authType === 'oauth'}
      {#if !integration.connected}
        <Button
          variant="primary"
          size="sm"
          fullWidth={compact}
          loading={oauthLoading}
          onclick={() => onconnect?.(integration.service, integration.requiredScopes || [])}
        >
          {oauthLoading ? 'Connecting...' : `Connect ${compact ? '' : 'with OAuth'}`}
        </Button>
      {:else if onconnectanother}
        <Button
          variant="secondary"
          size="sm"
          loading={oauthLoading}
          onclick={() => onconnectanother(integration.service, integration.requiredScopes || [])}
        >
          Connect another
        </Button>
      {/if}
    {:else if integration.authType === 'api_key' && !integration.connected}
      <div class="flex gap-2 w-full">
        <input
          type="password"
          placeholder="Bot token or API key"
          value={apiKeyValue}
          oninput={(e) => onapikeyinput?.((e.target as HTMLInputElement).value)}
          onkeydown={(e) => { if (e.key === 'Enter') onapikey?.(integration.service, integration.name); }}
          class="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] focus:border-[var(--theme-primary)] transition-colors"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!apiKeyValue?.trim()}
          onclick={() => onapikey?.(integration.service, integration.name)}
        >
          Connect
        </Button>
      </div>
    {/if}
  </div>
</div>
