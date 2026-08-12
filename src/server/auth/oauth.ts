/**
 * OAuth provider abstraction.
 *
 * The database (`OAuthAccount`) and the account-linking logic in `service.ts`
 * are ready for third-party sign-in. No concrete provider is registered because
 * none has credentials in this environment — and a sign-in button that cannot
 * complete a round trip is worse than no button, so the UI only renders
 * providers that `enabledProviders()` actually returns.
 *
 * Adding Google or Discord is: implement `OAuthProvider`, register it below,
 * and set the client id/secret in the environment.
 */

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  readonly id: string;
  readonly label: string;
  /** Where to send the browser to begin the flow. */
  authorizationUrl(state: string, redirectUri: string): string;
  /** Exchanges the callback code for the provider's view of the user. */
  exchange(code: string, redirectUri: string): Promise<OAuthProfile>;
}

const registry = new Map<string, OAuthProvider>();

export function registerProvider(provider: OAuthProvider) {
  registry.set(provider.id, provider);
}

export function enabledProviders(): OAuthProvider[] {
  return [...registry.values()];
}

export function getProvider(id: string): OAuthProvider | undefined {
  return registry.get(id);
}
