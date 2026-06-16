import { BridgeSession, type BridgeSessionOptions } from "./bridge-session.js";
import { createBridgeEnvelope, isRecord } from "./protocol.js";
import {
  type BridgeMessageEnvelope,
  type BridgeSessionState
} from "./types.js";
import {
  decodeNativeMessage,
  encodeNativeMessage,
  NativeHostFrameEncodeError,
  type NativeHostFrame
} from "./native-host-frame.js";
import {
  nativeHostError,
  type NativeHostHarnessError
} from "./native-host-errors.js";

export type FakeNativeHostOptions = {
  bridgeSession?: BridgeSession | undefined;
  bridgeSessionOptions?: BridgeSessionOptions | undefined;
  allowedCallerOrigins: readonly string[];
  maxRequestBytes?: number | undefined;
  maxResponseBytes?: number | undefined;
  clock?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
};

export type FakeNativeHostHandleOptions = {
  callerOrigin?: string | undefined;
};

export type FakeNativeHostResult =
  | {
      ok: true;
      responseFrame: NativeHostFrame;
      responseMessage: BridgeMessageEnvelope;
      state: BridgeSessionState;
      autoConvert: false;
      fileWritten: false;
      eventWritten: false;
    }
  | {
      ok: false;
      responseFrame?: NativeHostFrame | undefined;
      responseMessage?:
        | BridgeMessageEnvelope<NativeHostHarnessError>
        | undefined;
      error: NativeHostHarnessError;
      state: BridgeSessionState;
      autoConvert: false;
      fileWritten: false;
      eventWritten: false;
    };

const defaultMaxRequestBytes = 2_000_000;
const defaultMaxResponseBytes = 1_000_000;

export class FakeNativeHost {
  readonly session: BridgeSession;
  private readonly allowedCallerOrigins: readonly string[];
  private readonly maxRequestBytes: number;
  private readonly maxResponseBytes: number;
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(options: FakeNativeHostOptions) {
    this.session =
      options.bridgeSession ??
      new BridgeSession(options.bridgeSessionOptions ?? {});
    this.allowedCallerOrigins = options.allowedCallerOrigins;
    this.maxRequestBytes = options.maxRequestBytes ?? defaultMaxRequestBytes;
    this.maxResponseBytes = options.maxResponseBytes ?? defaultMaxResponseBytes;
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => "native-host-error");
  }

  handleFrame(
    frame: NativeHostFrame,
    options: FakeNativeHostHandleOptions = {}
  ): FakeNativeHostResult {
    const originError = this.validateCallerOrigin(options.callerOrigin);
    if (originError !== undefined) {
      return this.errorResult(originError);
    }

    const decoded = decodeNativeMessage(frame, {
      maxMessageBytes: this.maxRequestBytes,
      requireObject: true
    });
    if (!decoded.ok) {
      return this.errorResult(decoded.error);
    }

    const envelopeError = this.validateBridgeEnvelopeShape(decoded.message);
    if (envelopeError !== undefined) {
      return this.errorResult(envelopeError);
    }

    const bridgeResult = this.session.handleEnvelope(
      decoded.message as BridgeMessageEnvelope
    );
    const responseMessage = bridgeResult.envelope;

    try {
      const responseFrame = encodeNativeMessage(responseMessage, {
        maxMessageBytes: this.maxResponseBytes
      });
      if (!bridgeResult.ok) {
        return {
          ok: false,
          responseFrame,
          responseMessage:
            responseMessage as BridgeMessageEnvelope<NativeHostHarnessError>,
          error: nativeHostError(
            "bridge_message_invalid",
            bridgeResult.error.safeMessage,
            "bridge",
            bridgeResult.error.retryable
          ),
          state: bridgeResult.state,
          autoConvert: false,
          fileWritten: false,
          eventWritten: false
        };
      }
      return {
        ok: true,
        responseFrame,
        responseMessage,
        state: bridgeResult.state,
        autoConvert: false,
        fileWritten: false,
        eventWritten: false
      };
    } catch (error) {
      if (error instanceof NativeHostFrameEncodeError) {
        return this.errorResult(error.error);
      }
      return this.errorResult(
        nativeHostError(
          "response_too_large",
          "Native host response could not be encoded safely",
          "response"
        )
      );
    }
  }

  getState(): BridgeSessionState {
    return this.session.getState();
  }

  private validateCallerOrigin(
    callerOrigin: string | undefined
  ): NativeHostHarnessError | undefined {
    if (callerOrigin === undefined || callerOrigin.length === 0) {
      return nativeHostError(
        "caller_origin_required",
        "Native host caller origin is required",
        "origin"
      );
    }
    if (
      this.allowedCallerOrigins.length === 0 ||
      !this.allowedCallerOrigins.includes(callerOrigin)
    ) {
      return nativeHostError(
        "caller_origin_rejected",
        "Native host caller origin is not allowlisted",
        "origin"
      );
    }
    return undefined;
  }

  private validateBridgeEnvelopeShape(
    message: Record<string, unknown>
  ): NativeHostHarnessError | undefined {
    if (
      message.schemaVersion !== 1 ||
      typeof message.messageId !== "string" ||
      typeof message.type !== "string" ||
      typeof message.sentAt !== "string" ||
      !isRecord(message.payload)
    ) {
      return nativeHostError(
        "bridge_message_invalid",
        "Native host frame did not contain a valid bridge envelope",
        "bridge"
      );
    }
    return undefined;
  }

  private errorResult(error: NativeHostHarnessError): FakeNativeHostResult {
    const responseMessage = createBridgeEnvelope("error", error, {
      messageId: `native-host-${this.idFactory()}`,
      sentAt: this.clock().toISOString()
    });

    try {
      return {
        ok: false,
        responseFrame: encodeNativeMessage(responseMessage, {
          maxMessageBytes: this.maxResponseBytes
        }),
        responseMessage,
        error,
        state: this.session.getState(),
        autoConvert: false,
        fileWritten: false,
        eventWritten: false
      };
    } catch {
      return {
        ok: false,
        error,
        state: this.session.getState(),
        autoConvert: false,
        fileWritten: false,
        eventWritten: false
      };
    }
  }
}
