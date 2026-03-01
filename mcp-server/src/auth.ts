/**
 * Authentication module for MCP server
 *
 * Supports two authentication methods:
 * 1. OAuth 2.1 tokens validated via Auth0 /userinfo endpoint (primary)
 * 2. API key fallback for local development (optional)
 *
 * This approach works with any token format (JWT, JWE, opaque) since
 * Auth0 handles all validation and decryption internally.
 */

import { loadOAuthConfig, type OAuthConfig } from "./oauth-config.js";

// Cached OAuth config
let cachedConfig: OAuthConfig | null = null;

// Token validation cache to avoid Auth0 rate limits
// Maps token hash -> { result, expiresAt }
interface CachedValidation {
  result: AuthResult;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedValidation>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Simple hash function for caching tokens
 */
function hashToken(token: string): string {
  // Use last 32 chars of token as cache key (signature part)
  return token.slice(-32);
}

/**
 * Clean up expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of tokenCache.entries()) {
    if (entry.expiresAt < now) {
      tokenCache.delete(key);
    }
  }
}

export interface AuthResult {
  valid: boolean;
  error?: string;
  // JWT-specific fields
  scopes?: string[];
  subject?: string;
  authMethod?: "jwt" | "api_key";
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Get OAuth config, loading from environment if needed
 */
function getConfig(): OAuthConfig | null {
  if (!cachedConfig) {
    cachedConfig = loadOAuthConfig();
  }
  return cachedConfig;
}

/**
 * Check if a token looks like a JWT (has 3 base64url parts)
 */
function isJwtFormat(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Validate token with Auth0 using /userinfo endpoint
 * This approach works with any token format (JWT, JWE, opaque)
 * Auth0 handles all validation, decryption, and scope checking
 * Results are cached to avoid hitting Auth0 rate limits
 */
async function validateWithAuth0(
  token: string,
  config: OAuthConfig
): Promise<AuthResult> {
  // Check cache first
  const tokenHash = hashToken(token);
  const cached = tokenCache.get(tokenHash);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // Clean up expired entries periodically
  if (tokenCache.size > 100) {
    cleanExpiredCache();
  }

  try {
    const response = await fetch(config.userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  [auth] Auth0 rejected token: ${response.status} - ${errorText}`);
      const result = {
        valid: false,
        error: `Auth0 rejected token: ${response.status} ${response.statusText}`,
      };
      // Don't cache errors
      return result;
    }

    const userInfo = await response.json();

    // Check if user is in allowlist (if configured)
    if (config.allowedUsers.length > 0) {
      if (!config.allowedUsers.includes(userInfo.sub)) {
        console.error(`  [auth] Access denied for user: ${userInfo.sub}`);
        const result = {
          valid: false,
          error: `Access denied: User ${userInfo.sub} is not authorized to access this resource`,
        };
        // Don't cache access denied
        return result;
      }
    }

    // Auth0 /userinfo returns user claims
    // For scopes, we grant all requested scopes since Auth0 validated the token
    // (Auth0 wouldn't return userinfo if the token was invalid)
    const result: AuthResult = {
      valid: true,
      subject: userInfo.sub,
      scopes: config.requiredScopes, // Grant all our scopes - token is valid
      authMethod: "jwt",
    };

    // Cache the successful result
    tokenCache.set(tokenHash, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  [auth] Validation error: ${message}`);
    return { valid: false, error: `Auth0 validation failed: ${message}` };
  }
}

/**
 * Validate API key (legacy/fallback method)
 */
function validateApiKey(token: string, config: OAuthConfig): AuthResult {
  if (!config.allowApiKeyFallback) {
    return {
      valid: false,
      error: "API key authentication is disabled. Use OAuth.",
    };
  }

  if (!config.apiKey) {
    return {
      valid: false,
      error: "Server misconfigured: API key fallback enabled but VAULT_MCP_API_KEY not set",
    };
  }

  if (token !== config.apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // API key auth grants all scopes (for backward compatibility)
  return {
    valid: true,
    scopes: ["read:vault", "write:vault", "prepare:meeting"],
    authMethod: "api_key",
  };
}

/**
 * Main authentication function
 * Validates Authorization header (Bearer token)
 */
export async function validateAuth(
  authHeader: string | null
): Promise<AuthResult> {
  const config = getConfig();

  // If OAuth not configured, fall back to API key only mode
  if (!config) {
    const apiKey = process.env.VAULT_MCP_API_KEY;
    if (!apiKey) {
      return {
        valid: false,
        error: "Server misconfigured: No authentication method configured",
      };
    }

    if (!authHeader) {
      return { valid: false, error: "Missing Authorization header" };
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return {
        valid: false,
        error: "Invalid Authorization header format. Expected: Bearer <token>",
      };
    }

    // Legacy API key mode
    if (parts[1] === apiKey) {
      return {
        valid: true,
        scopes: ["read:vault", "write:vault", "prepare:meeting"],
        authMethod: "api_key",
      };
    }

    return { valid: false, error: "Invalid API key" };
  }

  // OAuth is configured
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return {
      valid: false,
      error: "Invalid Authorization header format. Expected: Bearer <token>",
    };
  }

  const token = parts[1];
  const tokenParts = token.split(".");
  const isJwt = isJwtFormat(token);

  // Try OAuth validation (works with JWT, JWE, or opaque tokens)
  if (isJwt || tokenParts.length === 5) {
    return validateWithAuth0(token, config);
  } else {
    // Looks like an API key
    return validateApiKey(token, config);
  }
}

/**
 * Validate auth from header OR query parameter
 * Query parameter is for clients that don't support headers (legacy)
 */
export async function validateAuthFromRequest(
  req: Request
): Promise<AuthResult> {
  // Try header first
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    return validateAuth(authHeader);
  }

  // Fall back to query parameter (for legacy claude.ai which doesn't support headers)
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("api_key") || url.searchParams.get("key");
  if (apiKey) {
    return validateAuth(`Bearer ${apiKey}`);
  }

  return {
    valid: false,
    error: "Missing authentication. Use Authorization header or ?api_key= parameter",
  };
}

/**
 * Middleware-style auth check for request handlers
 */
export function requireAuth(authResult: AuthResult): void {
  if (!authResult.valid) {
    throw new AuthError(authResult.error || "Unauthorized");
  }
}

/**
 * Check if OAuth is configured
 */
export function isOAuthEnabled(): boolean {
  return getConfig() !== null;
}

/**
 * Get the OAuth config (for metadata endpoints)
 */
export function getOAuthConfig(): OAuthConfig | null {
  return getConfig();
}
