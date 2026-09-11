export type AiConfigStatus = {
  configured: boolean;
  method: "api_key" | "oidc" | null;
  setupMessage: string;
};

export const AI_MODEL = "openai/gpt-5.4";

export function getAiConfigStatus(): AiConfigStatus {
  if (process.env.AI_GATEWAY_API_KEY) {
    return {
      configured: true,
      method: "api_key",
      setupMessage: "AI Gateway configured via AI_GATEWAY_API_KEY.",
    };
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    return {
      configured: true,
      method: "oidc",
      setupMessage: "AI Gateway configured via VERCEL_OIDC_TOKEN.",
    };
  }

  return {
    configured: false,
    method: null,
    setupMessage:
      "AI Gateway is not configured. Set AI_GATEWAY_API_KEY in seasonal-travel/.env.local (or run vercel env pull after enabling AI Gateway). The travel agent cannot run until authentication is set up.",
  };
}
