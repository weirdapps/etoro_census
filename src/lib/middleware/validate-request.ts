import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a handler with request validation using Zod schemas.
 * Validates the request body against the provided schema before passing to handler.
 *
 * @param schema - Zod schema for request body validation
 * @param handler - Handler function to execute if validation passes
 * @returns Wrapped handler with validation
 */
export function withBodyValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const data = schema.parse(body);
      return handler(req, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON in request body',
          },
          { status: 400 }
        );
      }

      throw error;
    }
  };
}

/**
 * Creates a handler with query parameter validation using Zod schemas.
 *
 * @param schema - Zod schema for query parameter validation
 * @param handler - Handler function to execute if validation passes
 * @returns Wrapped handler with validation
 */
export function withQueryValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());
      const data = schema.parse(params);
      return handler(req, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid query parameters',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}

/**
 * Validates that required environment variables are present.
 * Returns an error response if any are missing.
 */
export function validateEnvVars(requiredVars: string[]): NextResponse | null {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error',
      },
      { status: 500 }
    );
  }

  return null;
}
