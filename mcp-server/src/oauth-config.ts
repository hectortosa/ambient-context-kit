/**
 * OAuth Configuration for Auth0 integration
 *
 * Loads OAuth settings from environment variables and provides
 * configuration for JWT validation and OAuth metadata endpoints.
 */

export interface OAuthConfig {
  // Auth0 tenant domain (e.g., "ambient-context.auth0.com")
  domain: string;
  // API identifier/audience (e.g., "https://vault-mcp.example.com")
  audience: string;
  // Client secret for JWE decryption (when Claude.ai sends encrypted id_token)
  clientSecret: string | null;
  // Derived URLs
  issuer: string;
  jwksUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  // Scopes
  requiredScopes: string[];
  supportedScopes: string[];
  // User allowlist - restrict access to specific Auth0 subject IDs
  allowedUsers: string[];
  // Fallback options
  allowApiKeyFallback: boolean;
  apiKey: string | null;
}

/**
 * Load OAuth configuration from environment
 * Returns null if Auth0 is not configured
 */
export function loadOAuthConfig(): OAuthConfig | null {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;

  if (!domain || !audience) {
    return null;
  }

  const requiredScopesStr = process.env.AUTH0_REQUIRED_SCOPES || "read:vault";
  const requiredScopes = requiredScopesStr.split(",").map((s) => s.trim());

  // Parse allowed users list (comma-separated Auth0 subject IDs)
  const allowedUsersStr = process.env.AUTH0_ALLOWED_USERS || "";
  const allowedUsers = allowedUsersStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    domain,
    audience,
    clientSecret: process.env.AUTH0_CLIENT_SECRET || null,
    issuer: `https://${domain}/`,
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    authorizationEndpoint: `https://${domain}/authorize`,
    tokenEndpoint: `https://${domain}/oauth/token`,
    userinfoEndpoint: `https://${domain}/userinfo`,
    requiredScopes,
    supportedScopes: [
      "openid",
      "profile",
      "email",
      "read:vault",
      "write:vault",
      "prepare:meeting",
    ],
    allowedUsers,
    allowApiKeyFallback: process.env.ALLOW_API_KEY_FALLBACK === "true",
    apiKey: process.env.VAULT_MCP_API_KEY || null,
  };
}

/**
 * Tool to scope mapping
 * Defines which scopes are required for each MCP tool
 */
export const toolScopes: Record<string, string[]> = {
  list_toc: ["read:vault"],
  list_tasks: ["read:vault"],
  get_memory: ["read:vault"],
  find_context: ["read:vault"],
  add_quick_note: ["write:vault"],
  update_task: ["write:vault"],
  update_meeting_note: ["write:vault"],
  prepare_meeting: ["read:vault", "prepare:meeting"],
};

/**
 * Check if user has required scopes for a tool
 */
export function hasRequiredScopes(
  toolName: string,
  userScopes: string[]
): boolean {
  const required = toolScopes[toolName];
  if (!required) {
    // Unknown tool - require at least read:vault
    return userScopes.includes("read:vault");
  }
  return required.every((scope) => userScopes.includes(scope));
}

/**
 * Generate OAuth 2.0 Authorization Server Metadata
 * Per RFC 8414 - used by Claude.ai for OAuth discovery
 */
export function generateOAuthMetadata(
  config: OAuthConfig,
  serverUrl: string
): Record<string, unknown> {
  return {
    issuer: config.issuer,
    authorization_endpoint: config.authorizationEndpoint,
    token_endpoint: config.tokenEndpoint,
    userinfo_endpoint: config.userinfoEndpoint,
    jwks_uri: config.jwksUri,
    // Registration endpoint - not implemented (manual registration)
    // registration_endpoint: `${serverUrl}/oauth/register`,
    scopes_supported: config.supportedScopes,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    code_challenge_methods_supported: ["S256"],
    // Resource server info - use Auth0 API audience so Claude.ai sends it correctly
    // This ensures Auth0 returns a 3-part JWT instead of a 5-part opaque token
    resource: config.audience,
  };
}
