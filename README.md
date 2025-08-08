# next-zod-route

A fork from [next-safe-route](https://github.com/richardsolomou/next-safe-route) that uses [zod](https://github.com/colinhacks/zod) for schema validation.

`next-zod-route` is a utility library for Next.js that provides type-safety and schema validation for [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)/API Routes with enhanced error handling capabilities.

## Features

- **✅ Schema Validation:** Automatically validates request parameters, query strings, and body content with built-in error handling.
- **🧷 Type-Safe:** Works with full TypeScript type safety for parameters, query strings, and body content.
- **😌 Easy to Use:** Simple and intuitive API that makes defining route handlers a breeze.
- **🔄 Flexible Response Handling:** Return Response objects directly or return plain objects that are automatically converted to JSON responses.
- **🧪 Fully Tested:** Extensive test suite to ensure everything works reliably.
- **🔐 Enhanced Middleware System:** Powerful middleware system with pre/post handler execution, response modification, and context chaining.
- **🎯 Metadata Support:** Add and validate metadata for your routes with full type safety.
- **🛡️ Structured Error Handling:** Rich error handling with `RouteHandlerError` interface providing status codes, error codes, and metadata for better API consistency and debugging.

## Installation

```sh
npm install next-zod-route zod
```

Or using your preferred package manager:

```sh
pnpm add next-zod-route zod
```

```sh
yarn add next-zod-route zod
```

## Usage

```ts
// app/api/hello/route.ts
import { createZodRoute, type RouteHandlerError } from "next-zod-route";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string(),
});

const querySchema = z.object({
  search: z.string().optional(),
});

const bodySchema = z.object({
  field: z.string(),
});

export const GET = createZodRoute()
  .params(paramsSchema)
  .query(querySchema)
  .handler((request, context) => {
    const { id } = context.params;
    const { search } = context.query;

    return { id, search, permission, role };
  });

export const POST = createZodRoute()
  .params(paramsSchema)
  .query(querySchema)
  .body(bodySchema)
  .handler((request, context) => {
    // Next.js 15 use promise, but with .params we already unwrap the promise for you
    const { id } = context.params;
    const { search } = context.query;
    const { field } = context.body;

    // Custom status
    return (NextResponse.json({ id, search, field }), { status: 400 });
  });
```

To define a route handler in Next.js:

1. Import `createZodRoute` and `zod`.
2. Define validation schemas for params, query, body, and metadata as needed.
3. Use `createZodRoute()` to create a route handler, chaining `params`, `query`, `body`, and `defineMetadata` methods.
4. Implement your handler function, accessing validated and type-safe params, query, body, and metadata through `context`.

## Supported Body Formats

`next-zod-route` supports multiple request body formats out of the box:

- **JSON:** Automatically parses and validates JSON bodies.
- **URL Encoded:** Supports `application/x-www-form-urlencoded` data.
- **Multipart Form Data:** Supports `multipart/form-data`, enabling file uploads and complex form data parsing.

The library automatically detects the content type and parses the body accordingly. For GET and DELETE requests, body parsing is skipped.

## Response Handling

You can return responses in two ways:

- A. **Return a Response object directly:**

  ```ts
  return NextResponse.json({ data: "value" }, { status: 200 });
  ```

- B. **Return a plain object** that will be automatically converted to a JSON response with status 200:

  ```ts
  return { data: "value" };
  ```

## Advanced Usage

## Create client

You can create a reusable client in a file, I recommend `/src/lib/route.ts` with the following content:

```tsx
import { createZodRoute } from 'next-zod-route';

const route = createZodRoute();

// Create other re-usable route
const authRoute = route.use(...)
```

### Static Parameters with Metadata

Metadata enable you to add **static parameters** to the route, for example to give permissions list to our application.

One powerful use case for metadata is defining required permissions for routes and checking them in middleware. This allows you to:

1. Declare permissions statically at the route level
2. Enforce permissions consistently across your application
3. Keep authorization logic separate from your route handlers

Here's how to implement permission-based authorization:

```ts
import { type MiddlewareFunction } from "next-zod-route";

// Define a schema for permissions metadata
const permissionsMetadataSchema = z.object({
  requiredPermissions: z.array(z.string()).optional(),
});

// Create a middleware that checks permissions
const permissionCheckMiddleware: MiddlewareFunction = async ({
  next,
  metadata,
  request,
}) => {
  // Get user permissions from auth header, token, or session
  const userPermissions = getUserPermissions(request);

  // If no required permissions in metadata, allow access
  if (
    !metadata?.requiredPermissions ||
    metadata.requiredPermissions.length === 0
  ) {
    return next({ context: { authorized: true } });
  }

  // Check if user has all required permissions
  const hasAllPermissions = metadata.requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );

  if (!hasAllPermissions) {
    // Short-circuit with 403 Forbidden response
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "You do not have the required permissions",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Continue with authorized context
  return next({ context: { authorized: true } });
};

// Use in your route handlers
export const GET = createZodRoute()
  .defineMetadata(permissionsMetadataSchema)
  .use(permissionCheckMiddleware)
  .metadata({ requiredPermissions: ["read:users"] })
  .handler((request, context) => {
    // Only executed if user has 'read:users' permission
    return Response.json({ data: "Protected data" });
  });

export const POST = createZodRoute()
  .defineMetadata(permissionsMetadataSchema)
  .use(permissionCheckMiddleware)
  .metadata({ requiredPermissions: ["write:users"] })
  .handler((request, context) => {
    // Only executed if user has 'write:users' permission
    return Response.json({ success: true });
  });

export const DELETE = createZodRoute()
  .defineMetadata(permissionsMetadataSchema)
  .use(permissionCheckMiddleware)
  .metadata({ requiredPermissions: ["admin:users"] })
  .handler((request, context) => {
    // Only executed if user has 'admin:users' permission
    return Response.json({ success: true });
  });
```

This pattern allows you to:

- Clearly document required permissions for each route
- Apply consistent authorization logic across your application
- Skip permission checks for public routes by not specifying required permissions
- Combine with other middleware for comprehensive request processing

### Middleware

You can add middleware to your route handler with the `use` method. Middleware functions can add data to the context that will be available in your handler.

```ts
import { type MiddlewareFunction, createZodRoute } from "next-zod-route";

const loggingMiddleware: MiddlewareFunction = async ({ next }) => {
  console.log("Before handler");
  const startTime = performance.now();

  // next() returns a Promise<Response>
  const response = await next();

  const endTime = performance.now() - startTime;
  console.log(`After handler - took ${Math.round(endTime)}ms`);

  return response;
};

const authMiddleware: MiddlewareFunction = async ({
  request,
  metadata,
  next,
}) => {
  try {
    // Get the token from the request headers
    const token = request.headers.get("authorization")?.split(" ")[1];

    // You can access metadata in middleware
    if (metadata?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Validate the token and get the user
    const user = await validateToken(token);

    // Add context & continue chain
    // next() accepts an optional object with a context property
    const response = await next({
      context: { user }, // This context will be merged with existing context
    });

    // You can modify the response after the handler
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "X-User-Id": user.id,
      },
    });
  } catch (error) {
    // Errors in middleware are caught and handled by the error handler
    throw error;
  }
};

const permissionsMiddleware: MiddlewareFunction = async ({
  metadata,
  next,
}) => {
  // Metadata are optional and type-safe
  const response = await next({
    context: { permissions: metadata?.permissions ?? ["read"] },
  });
  return response;
};

export const GET = createZodRoute()
  .defineMetadata(
    z.object({
      role: z.enum(["admin", "user"]),
      permissions: z.array(z.string()).optional(),
    }),
  )
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(permissionsMiddleware)
  .handler((request, context) => {
    // Access middleware data from context.data
    const { user, permissions } = context.data;
    // Access metadata from context.metadata
    const { role } = context.metadata!;

    return Response.json({ user, permissions, role });
  });
```

Middleware functions receive:

- `request`: The request object
- `context`: The context object with data from previous middlewares
- `metadata`: The validated metadata object (optional)
- `next`: Function to continue the chain and add context

The middleware can:

1. Execute code before/after the handler
2. Modify the response
3. Add context data through the chain
4. Short-circuit the chain by returning a Response
5. Throw errors that will be caught by the error handler

### Middleware Features

#### Pre/Post Handler Execution

```ts
import { type MiddlewareFunction } from "next-zod-route";

const timingMiddleware: MiddlewareFunction = async ({ next }) => {
  console.log("Starting request...");
  const start = performance.now();

  const response = await next();

  const duration = performance.now() - start;
  console.log(`Request took ${duration}ms`);

  return response;
};
```

#### Response Modification

```ts
import { type MiddlewareFunction } from "next-zod-route";

const headerMiddleware: MiddlewareFunction = async ({ next }) => {
  const response = await next();

  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "X-Custom": "value",
    },
  });
};
```

#### Context Chaining

```ts
import { type MiddlewareFunction } from "next-zod-route";

const middleware1: MiddlewareFunction = async ({ next }) => {
  const response = await next({
    context: { value1: "first" },
  });
  return response;
};

const middleware2: MiddlewareFunction = async ({ context, next }) => {
  // Access previous context
  console.log(context.value1); // 'first'

  const response = await next({
    context: { value2: "second" },
  });
  return response;
};
```

#### Early Returns

```ts
import { type MiddlewareFunction } from "next-zod-route";

const authMiddleware: MiddlewareFunction = async ({ next }) => {
  const isAuthed = false;

  if (!isAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return next();
};
```

### Migration Guide (v0.2.0)

If you're upgrading from v0.1.x to v0.2.0, there are some changes to the middleware system:

#### Before (v0.1.x)

```typescript
const authMiddleware = async () => {
  return { user: { id: "user-123" } };
};

const route = createZodRoute()
  .use(authMiddleware)
  .handler((req, ctx) => {
    const { user } = ctx.data;
    return { data: user.id };
  });
```

#### After (v0.2.0)

```typescript
import { type MiddlewareFunction } from "next-zod-route";

const authMiddleware: MiddlewareFunction = async ({ next }) => {
  // Execute code before handler
  console.log("Checking auth...");

  // Add context & continue chain
  const response = await next({
    context: { user: { id: "user-123" } },
  });

  // Modify response or execute code after
  return new Response(response.body, {
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "X-User-Id": "user-123",
    },
  });
};

const route = createZodRoute()
  .use(authMiddleware)
  .handler((req, ctx) => {
    const { user } = ctx.data;
    return { data: user.id };
  });
```

Key changes in v0.2.0:

1. Middleware must now accept an object with `request`, `context`, `metadata`, and `next`
2. Context is passed explicitly via `next({ context: {...} })`
3. Middleware can execute code before and after the handler
4. Middleware can modify the response
5. Middleware can short-circuit by returning a Response
6. Error handling in middleware is now consistent with handler error handling

### Error Handling

#### RouteHandlerError Interface

`next-zod-route` provides a structured error interface for better error handling and API consistency:

```ts
import { type RouteHandlerError, createZodRoute } from "next-zod-route";

// The RouteHandlerError interface extends the standard Error
interface RouteHandlerError extends Error {
  status: number; // HTTP status code (required)
  code: string; // Application error code (required)
  metadata?: Record<string, unknown>; // Additional error context (optional)
}
```

#### Creating Custom Errors

You can create custom error classes that implement the `RouteHandlerError` interface:

```ts
import { type RouteHandlerError } from "next-zod-route";

// Validation error with field details
class ValidationError extends Error implements RouteHandlerError {
  status = 422;
  code = "VALIDATION_ERROR";
  metadata: Record<string, unknown>;

  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.metadata = {
      fields,
      timestamp: new Date().toISOString(),
    };
  }
}

// Authentication error
class AuthError extends Error implements RouteHandlerError {
  status = 401;
  code = "UNAUTHORIZED";

  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

// Permission error with required permissions
class PermissionError extends Error implements RouteHandlerError {
  status = 403;
  code = "INSUFFICIENT_PERMISSIONS";
  metadata: Record<string, unknown>;

  constructor(message: string, required: string[], current: string[]) {
    super(message);
    this.name = "PermissionError";
    this.metadata = {
      required,
      current,
      resource: "API endpoint",
    };
  }
}

// Rate limiting error
class RateLimitError extends Error implements RouteHandlerError {
  status = 429;
  code = "RATE_LIMIT_EXCEEDED";
  metadata: Record<string, unknown>;

  constructor(limit: number, resetTime: string) {
    super("Too many requests");
    this.name = "RateLimitError";
    this.metadata = {
      limit,
      resetTime,
      retryAfter: 60,
    };
  }
}
```

#### Custom Error Handler

You can specify a custom error handler function to handle `RouteHandlerError` instances:

```ts
import { type RouteHandlerError, createZodRoute } from 'next-zod-route';

// Enhanced error handler that uses RouteHandlerError properties
const safeRoute = createZodRoute({
  handleServerError: (error: RouteHandlerError) => {
    // Log error with structured data
    console.error(`[${error.code}] ${error.message}`, {
      status: error.status,
      metadata: error.metadata,
      stack: error.stack
    });

    // Handle different error types
    if (error.code === 'VALIDATION_ERROR') {
      return new Response(JSON.stringify({
        error: error.message,
        code: error.code,
        fields: error.metadata?.fields
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return new Response(JSON.stringify({
        error: error.message,
        code: error.code,
        retryAfter: error.metadata?.retryAfter
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(error.metadata?.retryAfter || 60)
        }
      });
    }

    // Default structured error response
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' }
    });
  },
});

// Usage in route handlers
export const POST = safeRoute
  .body(z.object({
    email: z.string().email(),
    age: z.number().min(18)
  }))
  .handler((request, context) => {
    const { email, age } = context.body;

    // Throw structured validation error
    if (!email.includes('@company.com')) {
      throw new ValidationError('Invalid email domain', {
        email: 'Must be a company email address'
      });
    }

    // Throw permission error
    if (age < 21) {
      throw new PermissionError('Access denied', ['adult'], ['minor']);
    }

    return { success: true, user: { email, age } };
  });
```

#### Error Response Examples

With the `RouteHandlerError` interface, your API responses become more consistent and informative:

```json
// Validation Error Response (422)
{
  "error": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "fields": {
    "email": "Invalid email format",
    "age": "Must be greater than 18"
  }
}

// Authentication Error Response (401)
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "timestamp": "2025-08-07T10:30:00Z"
}

// Permission Error Response (403)
{
  "error": "Access denied",
  "code": "INSUFFICIENT_PERMISSIONS",
  "metadata": {
    "required": ["admin", "write"],
    "current": ["user", "read"],
    "resource": "API endpoint"
  }
}

// Rate Limit Error Response (429)
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Note:** The additional fields like `fields`, `timestamp`, `retryAfter`, etc. come from the `metadata` property of your custom error classes and are included in the response by your custom error handler.

#### Benefits of RouteHandlerError

- **Consistency:** All errors follow the same structure with `status`, `code`, and optional `metadata`
- **Type Safety:** Full TypeScript support for error properties
- **Rich Context:** Include additional information via `metadata` for better debugging and client handling
- **API Documentation:** Error codes make it easier to document expected error responses
- **Client Handling:** Frontend applications can handle errors more intelligently based on error codes

By default, if no custom error handler is provided, the library will return a generic "Internal server error" message with a 500 status code to avoid information leakage.

## Validation Errors

When validation fails, the library returns appropriate error responses:

- Invalid params: `{ message: 'Invalid params' }` with status 400
- Invalid query: `{ message: 'Invalid query' }` with status 400
- Invalid body: `{ message: 'Invalid body' }` with status 400

## Tests

Tests are written using [Vitest](https://vitest.dev). To run the tests, use the following command:

```sh
pnpm test
```

## Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
