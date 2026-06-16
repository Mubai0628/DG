export type NativeHostHarnessErrorKind =
  | "frame_too_short"
  | "frame_too_large"
  | "frame_length_mismatch"
  | "frame_invalid_json"
  | "frame_non_object"
  | "frame_encode_failed"
  | "caller_origin_required"
  | "caller_origin_rejected"
  | "bridge_message_invalid"
  | "response_too_large";

export type NativeHostHarnessError = {
  errorCode: NativeHostHarnessErrorKind;
  safeMessage: string;
  stage: "frame" | "origin" | "bridge" | "response";
  retryable: boolean;
};

export function nativeHostError(
  errorCode: NativeHostHarnessErrorKind,
  safeMessage: string,
  stage: NativeHostHarnessError["stage"],
  retryable = false
): NativeHostHarnessError {
  return {
    errorCode,
    safeMessage,
    stage,
    retryable
  };
}
