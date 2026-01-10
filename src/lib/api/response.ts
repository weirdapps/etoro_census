import { NextResponse } from 'next/server';

/**
 * Standard API response structure for consistent API responses.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    duration?: number;
    [key: string]: unknown;
  };
}

/**
 * Creates a successful API response with standardized structure.
 *
 * @param data - The data to return
 * @param meta - Optional metadata to include
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

/**
 * Creates an error API response with standardized structure.
 *
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 * @param meta - Optional metadata to include
 */
export function errorResponse(
  error: string,
  status = 500,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

/**
 * Creates a not found response.
 *
 * @param resource - Name of the resource that wasn't found
 */
export function notFoundResponse(resource = 'Resource'): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Creates a bad request response.
 *
 * @param message - Error message
 */
export function badRequestResponse(message: string): NextResponse<ApiResponse> {
  return errorResponse(message, 400);
}

/**
 * Creates an unauthorized response.
 *
 * @param message - Error message (default: 'Unauthorized')
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

/**
 * Creates a rate limit exceeded response.
 *
 * @param retryAfter - Seconds until retry is allowed
 */
export function rateLimitResponse(retryAfter?: number): NextResponse<ApiResponse> {
  const response = errorResponse('Rate limit exceeded', 429);

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
    response.headers.set('X-RateLimit-Reset', String(Date.now() + retryAfter * 1000));
  }

  return response;
}

/**
 * Wraps an async handler with timing and error handling.
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler with timing and error handling
 */
export function withTiming<T>(
  handler: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();

  return handler()
    .then((result) => ({
      result,
      duration: Date.now() - startTime,
    }))
    .catch((error) => {
      throw { error, duration: Date.now() - startTime };
    });
}
