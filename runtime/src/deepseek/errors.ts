export type DeepSeekApiErrorKind =
  | "invalid_request"
  | "authentication"
  | "insufficient_balance"
  | "invalid_parameters"
  | "rate_limited"
  | "server_error"
  | "overloaded"
  | "network_error"
  | "timeout"
  | "invalid_response"
  | "unknown";

export class DeepSeekClientError extends Error {
  readonly kind: DeepSeekApiErrorKind;
  readonly status?: number;

  constructor(
    kind: DeepSeekApiErrorKind,
    message: string,
    options: { status?: number } = {}
  ) {
    super(message);
    this.name = "DeepSeekClientError";
    this.kind = kind;
    if (options.status !== undefined) {
      this.status = options.status;
    }
  }
}

export function mapHttpStatusToErrorKind(status: number): DeepSeekApiErrorKind {
  switch (status) {
    case 400:
      return "invalid_request";
    case 401:
      return "authentication";
    case 402:
      return "insufficient_balance";
    case 422:
      return "invalid_parameters";
    case 429:
      return "rate_limited";
    case 500:
      return "server_error";
    case 503:
      return "overloaded";
    default:
      return "unknown";
  }
}
