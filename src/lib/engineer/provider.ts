/**
 * Provider-flexible LLM adapter (OpenAI-compatible chat completions).
 *
 * No provider is preselected: the base URL and model come from
 * `engineer_settings`, the key from the ENGINEER_LLM_API_KEY secret. Nothing
 * here reads or forwards Alpaca credentials — the runner never receives them.
 *
 * Pure fetch logic, shared by the server and `scripts/engineer-runner.ts`.
 */

export interface ProviderConfig {
  base_url: string;
  model: string;
  api_key: string;
  price_per_million_tokens: number;
}

export interface ProviderReadiness {
  configured: boolean;
  missing: string[];
}

const KEY_ENV = "ENGINEER_LLM_API_KEY";

/** Which pieces of the provider configuration are still missing. */
export function providerReadiness(
  baseUrl: string | null | undefined,
  model: string | null | undefined,
): ProviderReadiness {
  const missing: string[] = [];
  if (!baseUrl?.trim()) missing.push("API base URL");
  if (!model?.trim()) missing.push("model");
  if (!process.env[KEY_ENV]?.trim()) missing.push("ENGINEER_LLM_API_KEY");
  return { configured: missing.length === 0, missing };
}

export function resolveProvider(
  baseUrl: string | null | undefined,
  model: string | null | undefined,
  pricePerMillionTokens = 0,
): ProviderConfig | null {
  const key = process.env[KEY_ENV]?.trim();
  if (!baseUrl?.trim() || !model?.trim() || !key) return null;
  return {
    base_url: baseUrl.replace(/\/+$/, ""),
    model: model.trim(),
    api_key: key,
    price_per_million_tokens: pricePerMillionTokens,
  };
}

export function estimateCostUsd(tokens: number, pricePerMillionTokens: number): number {
  return Math.round((tokens / 1_000_000) * pricePerMillionTokens * 1_000_000) / 1_000_000;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  ok: boolean;
  text: string;
  tokens: number;
  error?: string;
}

/** One OpenAI-compatible chat completion. Never throws. */
export async function chatCompletion(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: { maxTokens?: number; timeoutMs?: number; json?: boolean } = {},
): Promise<ChatResult> {
  const url = `${config.base_url}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.15,
    max_tokens: options.maxTokens ?? 4000,
  };
  if (options.json) body["response_format"] = { type: "json_object" };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
    });

    const raw = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        text: "",
        tokens: 0,
        error: `Provider responded ${response.status}: ${raw.slice(0, 400)}`,
      };
    }

    let parsed: {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return { ok: false, text: "", tokens: 0, error: "Provider returned a non-JSON body." };
    }

    const text = parsed.choices?.[0]?.message?.content ?? "";
    const tokens =
      parsed.usage?.total_tokens ??
      (parsed.usage?.prompt_tokens ?? 0) + (parsed.usage?.completion_tokens ?? 0);
    if (!text)
      return { ok: false, text: "", tokens, error: "Provider returned an empty completion." };
    return { ok: true, text, tokens };
  } catch (error) {
    const message = error instanceof Error ? error.message : "provider request failed";
    return { ok: false, text: "", tokens: 0, error: message };
  }
}

export interface ProviderTestResult {
  ok: boolean;
  detail: string;
  model?: string;
}

/**
 * Connectivity probe. Cheap: asks for a one-token completion so a bad URL, a
 * bad key or a wrong model name is reported honestly instead of assumed.
 */
export async function testProviderConnection(config: ProviderConfig): Promise<ProviderTestResult> {
  const result = await chatCompletion(
    config,
    [
      { role: "system", content: "Reply with the single word: ready" },
      { role: "user", content: "ping" },
    ],
    { maxTokens: 8, timeoutMs: 20_000 },
  );
  if (!result.ok) return { ok: false, detail: result.error ?? "Connection failed." };
  return {
    ok: true,
    detail: `Connected — model replied "${result.text.trim().slice(0, 40)}".`,
    model: config.model,
  };
}
