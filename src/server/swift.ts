/**
 * Server-only Swift SMS OTP Adapter
 *
 * Implements communication with the Swift SMS OTP verification service.
 * Never import or execute this module in client components or browser bundles.
 */

export interface SwiftConfig {
  baseUrl: string;
  projectKey: string;
}

export class SwiftError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly attemptsRemaining?: number;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      attemptsRemaining?: number;
      retryAfterSeconds?: number;
    }
  ) {
    super(message);
    this.name = 'SwiftError';
    this.code = options.code;
    this.status = options.status;
    this.attemptsRemaining = options.attemptsRemaining;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export interface SwiftSendResult {
  success: boolean;
  requestId: string;
  expiresIn: number;
  resendAfter: number;
  status: string;
  phone: string;
}

export interface SwiftVerifyResult {
  success: boolean;
  verified: boolean;
  challengeId?: string;
  verifiedAt?: string;
}

export interface VerifyParams {
  phone: string;
  requestId: string;
  otp: string;
}

/**
 * Normalizes phone numbers to standard E.164 format.
 * Throws a SwiftError if the format is invalid.
 */
export function normalizeE164Phone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new SwiftError('Phone number is required', {
      code: 'INVALID_PHONE_FORMAT',
      status: 400,
    });
  }

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Must match E.164: + followed by 7-15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new SwiftError(
      'Invalid phone number format. Must follow E.164 format (e.g., +919876543210)',
      {
        code: 'INVALID_PHONE_FORMAT',
        status: 400,
      }
    );
  }

  return cleaned;
}

/**
 * Resolves server-only configuration.
 */
export function getSwiftConfig(): SwiftConfig {
  const baseUrl = (process.env.SWIFT_BASE_URL || 'https://global-otp-service.vercel.app').replace(/\/+$/, '');
  const projectKey = process.env.SWIFT_PROJECT_KEY;

  if (!projectKey) {
    throw new SwiftError('SWIFT_PROJECT_KEY is not configured on the server', {
      code: 'SWIFT_CONFIG_MISSING',
      status: 500,
    });
  }

  return { baseUrl, projectKey };
}

/**
 * Parses upstream error response safely without leaking credentials.
 */
function parseSwiftError(status: number, data: any): SwiftError {
  let message = 'Verification request failed';
  let attemptsRemaining: number | undefined;
  let retryAfterSeconds: number | undefined;

  if (typeof data === 'string') {
    message = data;
  } else if (data && typeof data === 'object') {
    if (typeof data.error === 'string') {
      message = data.error;
    } else if (data.error && typeof data.error === 'object') {
      message = data.error.message || message;
      if (typeof data.error.attempts_remaining === 'number') {
        attemptsRemaining = data.error.attempts_remaining;
      }
    }

    if (typeof data.attempts_remaining === 'number') {
      attemptsRemaining = data.attempts_remaining;
    }

    if (typeof data.retry_after_seconds === 'number') {
      retryAfterSeconds = data.retry_after_seconds;
    } else if (data.data && typeof data.data.retry_after_seconds === 'number') {
      retryAfterSeconds = data.data.retry_after_seconds;
    }
  }

  switch (status) {
    case 400:
      return new SwiftError(message || 'Invalid verification request or incorrect code', {
        code: 'SWIFT_INVALID_REQUEST',
        status: 400,
        attemptsRemaining,
      });
    case 401:
      return new SwiftError('Invalid or unauthorized Swift project key', {
        code: 'SWIFT_UNAUTHORIZED',
        status: 401,
      });
    case 403:
      return new SwiftError('Swift project access is disabled', {
        code: 'SWIFT_FORBIDDEN',
        status: 403,
      });
    case 404:
      return new SwiftError('Verification challenge was not found', {
        code: 'SWIFT_NOT_FOUND',
        status: 404,
      });
    case 410:
      return new SwiftError('Verification code has expired. Please request a new code.', {
        code: 'SWIFT_EXPIRED',
        status: 410,
      });
    case 429:
      return new SwiftError(message || 'Verification rate limit exceeded or cooldown active', {
        code: 'SWIFT_RATE_LIMITED',
        status: 429,
        retryAfterSeconds: retryAfterSeconds || 30,
      });
    case 500:
    case 503:
      return new SwiftError('Upstream SMS verification service is temporarily unavailable', {
        code: 'SWIFT_GATEWAY_ERROR',
        status: 503,
      });
    default:
      return new SwiftError(message || `Upstream verification error (${status})`, {
        code: 'SWIFT_UPSTREAM_ERROR',
        status,
        attemptsRemaining,
        retryAfterSeconds,
      });
  }
}

/**
 * Executes a network call with 10-second timeout and bounded retry on 500/503.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // If transient server error and retry attempts remaining, backoff and retry
      if ((response.status === 500 || response.status === 503) && attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);

      if (err?.name === 'AbortError') {
        throw new SwiftError('Verification request timed out after 10 seconds', {
          code: 'SWIFT_TIMEOUT',
          status: 504,
        });
      }

      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }

      throw new SwiftError('Failed to communicate with SMS verification service', {
        code: 'SWIFT_NETWORK_FAILURE',
        status: 503,
      });
    }
  }
}

/**
 * Sends a verification code to the given E.164 phone.
 *
 * @param phone E.164 formatted phone number (+919876543210)
 * @param idempotencyKey Unique UUID for this send attempt
 * @param config Optional explicit Swift configuration (used in testing)
 */
export async function sendOtp(
  phone: string,
  idempotencyKey: string,
  config = getSwiftConfig()
): Promise<SwiftSendResult> {
  const normalizedPhone = normalizeE164Phone(phone);

  const url = `${config.baseUrl}/api/v1/otp/send`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Key': config.projectKey,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ phone: normalizedPhone }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw parseSwiftError(response.status, data);
  }

  const requestId = data?.request_id || data?.challenge_id || data?.data?.challenge_id;
  if (!requestId) {
    throw new SwiftError('Malformed upstream response: missing request_id', {
      code: 'SWIFT_MALFORMED_RESPONSE',
      status: 502,
    });
  }

  return {
    success: true,
    requestId,
    expiresIn: data?.expires_in ?? data?.data?.expires_in ?? 300,
    resendAfter: data?.resend_after ?? data?.data?.retry_after_seconds ?? 30,
    status: data?.data?.status || 'QUEUED',
    phone: normalizedPhone,
  };
}

/**
 * Verifies a code against an existing challenge request ID and phone.
 *
 * @param params { phone, requestId, otp }
 * @param config Optional explicit Swift configuration (used in testing)
 */
export async function verifyOtp(
  params: VerifyParams,
  config = getSwiftConfig()
): Promise<SwiftVerifyResult> {
  const normalizedPhone = normalizeE164Phone(params.phone);
  const otpString = String(params.otp ?? '').trim();

  if (!otpString) {
    throw new SwiftError('Verification code is required', {
      code: 'INVALID_OTP_FORMAT',
      status: 400,
    });
  }

  if (!params.requestId) {
    throw new SwiftError('Challenge request ID is required', {
      code: 'INVALID_CHALLENGE_ID',
      status: 400,
    });
  }

  const url = `${config.baseUrl}/api/v1/otp/verify`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Key': config.projectKey,
    },
    body: JSON.stringify({
      phone: normalizedPhone,
      request_id: params.requestId,
      otp: otpString,
    }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw parseSwiftError(response.status, data);
  }

  const isVerified = data?.verified === true || data?.data?.verified === true;
  if (!isVerified) {
    throw new SwiftError('Incorrect verification code', {
      code: 'SWIFT_WRONG_CODE',
      status: 400,
      attemptsRemaining: data?.attempts_remaining ?? data?.data?.attempts_remaining,
    });
  }

  return {
    success: true,
    verified: true,
    challengeId: data?.data?.challenge_id || params.requestId,
    verifiedAt: data?.data?.verified_at || new Date().toISOString(),
  };
}
