import { isRecord } from "./protocol.js";
import {
  nativeHostError,
  type NativeHostHarnessError
} from "./native-host-errors.js";

export type NativeHostFrame = Uint8Array;

export type NativeHostFrameCodecOptions = {
  maxMessageBytes?: number | undefined;
  requireObject?: boolean | undefined;
};

export type NativeHostFrameDecodeResult =
  | { ok: true; message: Record<string, unknown>; messageBytes: number }
  | { ok: false; error: NativeHostHarnessError };

const prefixBytes = 4;
const defaultMaxMessageBytes = 2_000_000;

export function encodeNativeMessage(
  message: unknown,
  options: NativeHostFrameCodecOptions = {}
): NativeHostFrame {
  const serialized = JSON.stringify(message);
  if (serialized === undefined) {
    throw new NativeHostFrameEncodeError(
      nativeHostError(
        "frame_encode_failed",
        "Native host message could not be encoded as JSON",
        "response"
      )
    );
  }
  const body = new TextEncoder().encode(serialized);
  const maxMessageBytes = options.maxMessageBytes ?? defaultMaxMessageBytes;
  if (body.byteLength > maxMessageBytes) {
    throw new NativeHostFrameEncodeError(
      nativeHostError(
        "response_too_large",
        "Native host frame message is too large",
        "response"
      )
    );
  }

  const frame = new Uint8Array(prefixBytes + body.byteLength);
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  view.setUint32(0, body.byteLength, true);
  frame.set(body, prefixBytes);
  return frame;
}

export function decodeNativeMessage(
  buffer: Uint8Array,
  options: NativeHostFrameCodecOptions = {}
): NativeHostFrameDecodeResult {
  if (buffer.byteLength < prefixBytes) {
    return {
      ok: false,
      error: nativeHostError(
        "frame_too_short",
        "Native host frame is too short",
        "frame"
      )
    };
  }

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );
  const messageBytes = view.getUint32(0, true);
  const maxMessageBytes = options.maxMessageBytes ?? defaultMaxMessageBytes;
  if (messageBytes > maxMessageBytes) {
    return {
      ok: false,
      error: nativeHostError(
        "frame_too_large",
        "Native host frame message is too large",
        "frame"
      )
    };
  }
  if (buffer.byteLength !== prefixBytes + messageBytes) {
    return {
      ok: false,
      error: nativeHostError(
        "frame_length_mismatch",
        "Native host frame length did not match its prefix",
        "frame"
      )
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(prefixBytes)
      )
    ) as unknown;
  } catch {
    return {
      ok: false,
      error: nativeHostError(
        "frame_invalid_json",
        "Native host frame did not contain valid JSON",
        "frame"
      )
    };
  }

  if ((options.requireObject ?? true) && !isRecord(parsed)) {
    return {
      ok: false,
      error: nativeHostError(
        "frame_non_object",
        "Native host frame JSON message must be an object",
        "frame"
      )
    };
  }

  return {
    ok: true,
    message: parsed as Record<string, unknown>,
    messageBytes
  };
}

export class NativeHostFrameEncodeError extends Error {
  readonly error: NativeHostHarnessError;

  constructor(error: NativeHostHarnessError) {
    super(error.safeMessage);
    this.name = "NativeHostFrameEncodeError";
    this.error = error;
  }
}
