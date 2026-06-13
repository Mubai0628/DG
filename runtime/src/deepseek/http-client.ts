import {
  validateDeepSeekChatRequest,
  sanitizeDeepSeekChatRequest
} from "./client.js";
import { DeepSeekClientError, mapHttpStatusToErrorKind } from "./errors.js";
import { mapDeepSeekUsageToUsageSummary } from "./usage.js";
import {
  type DeepSeekChatRequest,
  type DeepSeekChatResponse,
  type DeepSeekClient
} from "./types.js";

export type FetchImpl = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export type HttpDeepSeekClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchImpl;
};

export class HttpDeepSeekClient implements DeepSeekClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number | undefined;
  private readonly fetchImpl: FetchImpl;

  constructor(options: HttpDeepSeekClientOptions) {
    if (options.apiKey.length === 0) {
      throw new DeepSeekClientError(
        "authentication",
        "DeepSeek API key must be provided explicitly"
      );
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.deepseek.com";
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createChatCompletion(
    request: DeepSeekChatRequest
  ): Promise<DeepSeekChatResponse> {
    validateDeepSeekChatRequest(request);
    const sanitizedRequest = sanitizeDeepSeekChatRequest(request);
    const startedAt = Date.now();
    const controller = new AbortController();
    let didTimeout = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (this.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, this.timeoutMs);
    }

    try {
      const response = await this.fetchImpl(
        new URL("/chat/completions", this.baseUrl),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(sanitizedRequest),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new DeepSeekClientError(
          mapHttpStatusToErrorKind(response.status),
          `DeepSeek API request failed with status ${response.status}`,
          { status: response.status }
        );
      }

      const parsed = await parseJsonResponse(response);
      const chatResponse = parsed as DeepSeekChatResponse;
      chatResponse.usageSummary = mapDeepSeekUsageToUsageSummary(
        chatResponse.usage,
        {
          latencyMs: Date.now() - startedAt,
          model: chatResponse.model ?? request.model
        }
      );

      return chatResponse;
    } catch (error) {
      if (error instanceof DeepSeekClientError) {
        throw error;
      }
      if (didTimeout) {
        throw new DeepSeekClientError("timeout", "DeepSeek request timed out");
      }
      throw new DeepSeekClientError(
        "network_error",
        "DeepSeek network request failed"
      );
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new DeepSeekClientError(
      "invalid_response",
      "DeepSeek API returned invalid JSON"
    );
  }
}
