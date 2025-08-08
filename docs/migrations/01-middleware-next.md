# Migration Guide: Enhanced Middleware System (v0.2.0)

## Overview

Version 0.2.0 introduces a completely revamped middleware system that provides more power and flexibility. The new system supports:

- Code execution before and after handlers
- Response modification
- Context passing through the middleware chain
- Early returns/short-circuiting
- Type-safe metadata access
- Error handling integration

## Breaking Changes

1. Middleware must now accept an object with:
   - `request`: The incoming request
   - `ctx`: Current context from previous middleware
   - `metadata`: Optional route metadata (type-safe)
   - `next`: Function to continue the chain

2. Context is now passed explicitly via `next({ ctx: {...} })`

3. Middleware can return:
   - A Response object to short-circuit
   - The result of calling `next()`

## Migration Examples

### Basic Context Middleware

#### Before (v0.1.x)

```typescript
const authMiddleware = async () => {
  return { user: { id: "user-123" } };
};

const route = createZodRoute()
  .use(authMiddleware)
  .handler((req, { ctx }) => {
    const { user } = ctx;
    return { data: user.id };
  });
```

#### After (v0.2.0)

```typescript
const authMiddleware = async ({ next }) => {
  const response = await next({
    ctx: { user: { id: "user-123" } },
  });
  return response;
};

const route = createZodRoute()
  .use(authMiddleware)
  .handler((req, { ctx }) => {
    const { user } = ctx;
    return { data: user.id };
  });
```

### Advanced Features

#### 1. Pre/Post Handler Execution

```typescript
const loggingMiddleware = async ({ next }) => {
  console.log("Starting request...");
  const start = performance.now();

  const response = await next();

  const duration = performance.now() - start;
  console.log(`Request took ${duration}ms`);

  return response;
};
```

#### 2. Response Modification

```typescript
const headerMiddleware = async ({ next }) => {
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

#### 3. Context Chaining

```typescript
const middleware1 = async ({ next }) => {
  const response = await next({
    ctx: { value1: "first" },
  });
  return response;
};

const middleware2 = async ({ context, next }) => {
  // Access previous context
  console.log(context.value1); // 'first'

  const response = await next({
    ctx: { value2: "second" },
  });
  return response;
};
```

#### 4. Early Returns

```typescript
const authMiddleware = async ({ next }) => {
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

#### 5. Metadata example for permissions

A powerful pattern is using metadata to define required permissions for routes and checking them in middleware:

```typescript
// Define a schema for permissions metadata
const permissionsMetadataSchema = z.object({
  requiredPermissions: z.array(z.string()).optional(),
});

// Create a middleware that checks permissions
const permissionCheckMiddleware = async ({ next, metadata, request }) => {
  // Get user permissions from auth header, token, or session
  const token = request.headers.get("authorization")?.split(" ")[1];
  const userPermissions = await getUserPermissionsFromToken(token);

  // If no required permissions in metadata, allow access
  if (
    !metadata?.requiredPermissions ||
    metadata.requiredPermissions.length === 0
  ) {
    return next({ ctx: { authorized: true } });
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
  return next({ ctx: { authorized: true } });
};

// Use in your route handlers
const route = createZodRoute()
  .defineMetadata(permissionsMetadataSchema)
  .use(permissionCheckMiddleware)
  .metadata({ requiredPermissions: ["read:users"] })
  .handler((request, context) => {
    // Only executed if user has 'read:users' permission
    return Response.json({ data: "Protected data" });
  });
```

This pattern allows you to:

- Declare permissions statically at the route level
- Enforce permissions consistently across your application
- Skip permission checks for public routes by not specifying required permissions
- Short-circuit the request with an appropriate error response when permissions are missing

## Common Migration Patterns

### 1. Accessing Request Data

```typescript
// Before
const middleware = async () => {
  return { token: getToken() };
};

// After
const middleware = async ({ request, next }) => {
  const token = request.headers.get("authorization");
  return next({ ctx: { token } });
};
```

### 2. Chaining Multiple Middleware

```typescript
// Before
const middleware1 = async () => ({ value1: "first" });
const middleware2 = async () => ({ value2: "second" });

// After
const middleware1 = async ({ next }) => {
  return next({ ctx: { value1: "first" } });
};
const middleware2 = async ({ context, next }) => {
  return next({
    ctx: {
      ...context,
      value2: "second",
    },
  });
};
```

### 3. Response Transformation

```typescript
// Before
const middleware = async () => {
  return { transform: true };
};

// After
const middleware = async ({ next }) => {
  const response = await next({ ctx: { transform: true } });

  // Now you can transform the response
  const data = await response.json();
  return new Response(
    JSON.stringify({
      ...data,
      transformed: true,
    }),
    response,
  );
};
```

## Best Practices

1. Always return the result of `next()` or a new Response
2. Use type-safe metadata when possible
3. Keep middleware focused and composable
4. Use error handling middleware for specific error types
5. Chain context properly through multiple middleware
6. Consider response transformation needs

## Need Help?

If you need help migrating your middleware, feel free to open an issue on GitHub with your current middleware code and we'll help you migrate to the new system.
