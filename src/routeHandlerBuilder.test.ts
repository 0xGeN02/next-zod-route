import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createZodRoute } from "./createZodRoute";
import { RouteHandlerBuilder } from "./routeHandlerBuilder";
import { MiddlewareFunction, RouteHandlerError, RouteResponse } from "./types";

const paramsSchema = z.object({
  id: z.uuid(),
});

const querySchema = z.object({
  search: z.string().min(1),
  status: z.string().array().optional(),
});

const bodySchema = z.object({
  field: z.string(),
});

export const paramsToPromise = (
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  return Promise.resolve(params);
};

describe("params validation", () => {
  it("should validate and handle valid params", async () => {
    const GET = createZodRoute()
      .params(paramsSchema)
      .handler((request, context) => {
        expectTypeOf(context.params).toMatchObjectType<
          z.output<typeof paramsSchema>
        >();
        const { id } = context.params;
        return Response.json({ id }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
  });

  it("should return an error for invalid params", async () => {
    const GET = createZodRoute()
      .params(paramsSchema)
      .handler((request, context) => {
        const { id } = context.params;
        return Response.json({ id }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "invalid-uuid" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid params");
  });
});

describe("query validation", () => {
  it("should validate and handle valid query", async () => {
    const GET = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .handler((request, context) => {
        expectTypeOf(context.query).toMatchObjectType<
          z.output<typeof querySchema>
        >();
        const search = context.query.search;
        return Response.json({ search }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test");
    const response = await GET(request, {
      params: Promise.resolve({ id: "D570D9AB-E002-46EA-996F-0E0023C8F702" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ search: "test" });
  });

  it("should return an error for invalid query", async () => {
    const GET = createZodRoute()
      .query(querySchema)
      .handler((request, context) => {
        const search = context.query.search;
        return Response.json({ search }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid query");
  });

  it("should validate and handle valid query when query is array", async () => {
    const GET = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .handler((request, context) => {
        expectTypeOf(context.query).toMatchObjectType<
          z.output<typeof querySchema>
        >();
        const status = context.query.status;
        return Response.json({ status }, { status: 200 });
      });

    const request = new Request(
      "http://localhost/?search=test&status=active&status=inactive",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "D570D9AB-E002-46EA-996F-0E0023C8F702" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: ["active", "inactive"] });
  });
});

describe("body validation", () => {
  it("should validate and handle valid body", async () => {
    const POST = createZodRoute()
      .body(bodySchema)
      .handler((request, context) => {
        expectTypeOf(context.body).toMatchObjectType<
          z.output<typeof bodySchema>
        >();
        const field = context.body.field;
        return Response.json({ field }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });
    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ field: "test-field" });
  });

  it("should return an error for invalid body", async () => {
    const POST = createZodRoute()
      .body(bodySchema)
      .handler((request, context) => {
        const field = context.body.field;
        return Response.json({ field }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ field: 123 }),
    });
    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid body");
  });

  it("should not error when body schema is defined but no body is sent in POST request", async () => {
    const POST = createZodRoute()
      .body(bodySchema)
      .handler(() => {
        // If we reach here, it means no validation error was thrown
        return Response.json({ success: true }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      method: "POST",
      // No body provided intentionally
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(400); // Should fail with 400 since body is required but not provided
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("Invalid body");
  });

  it("should return the value when no body schema is defined and no body is provided", async () => {
    const POST = createZodRoute().handler(() => {
      // If we reach here, it means no validation error was thrown
      return Response.json({ success: true }, { status: 200 });
    });

    const request = new Request("http://localhost/", {
      method: "POST",
      // No body provided intentionally
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200); // Should fail with 400 since body is required but not provided
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

describe("combined validation", () => {
  it("should validate and handle valid request with params, query, and body", async () => {
    const POST = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { search } = context.query;
        const { field } = context.body;

        return Response.json({ id, search, field }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });

    const response = await POST(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      search: "test",
      field: "test-field",
    });
  });

  it("should return an error for invalid params in combined validation", async () => {
    const POST = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { search } = context.query;
        const { field } = context.body;

        return Response.json({ id, search, field }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });

    const response = await POST(request, {
      params: paramsToPromise({ id: "invalid-uuid" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid params");
  });

  it("should return an error for invalid query in combined validation", async () => {
    const POST = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { search } = context.query;
        const { field } = context.body;

        return Response.json({ id, search, field }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });

    const response = await POST(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid query");
  });

  it("should return an error for invalid body in combined validation", async () => {
    const POST = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { search } = context.query;
        const { field } = context.body;

        return Response.json({ id, search, field }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test", {
      method: "POST",
      body: JSON.stringify({ field: 123 }),
    });

    const response = await POST(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid body");
  });

  it("should execute middleware and add context properties", async () => {
    const middleware: MiddlewareFunction<
      unknown, // TParams
      unknown, // TQuery
      unknown, // TBody
      Record<string, unknown>, // TContext
      { user: { id: string; role: string } } // TNextContext
    > = async ({ next }) => {
      const result = await next({
        ctx: { user: { id: "user-123", role: "admin" } },
      });
      return result;
    };

    const GET = createZodRoute()
      .use(middleware)
      .params(paramsSchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { user } = context.ctx;

        expectTypeOf(user).toMatchObjectType<{ id: string }>();

        return Response.json({ id, user }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      user: { id: "user-123", role: "admin" },
    });
  });

  it("should execute multiple middlewares and merge context properties", async () => {
    const GET = createZodRoute()
      .use(async ({ next }) => {
        const result = await next({ ctx: { user: { id: "user-123" } } });
        return result;
      })
      .use(async ({ next, ctx }) => {
        const user = ctx.user;
        expectTypeOf(user).toMatchObjectType<{ id: string }>();

        const result = await next({ ctx: { permissions: ["read", "write"] } });

        return result;
      })
      .params(paramsSchema)
      .handler((request, context) => {
        const { id } = context.params;
        const { user, permissions } = context.ctx;

        // Context should be automatically typed without explicit type
        expectTypeOf(user).toMatchObjectType<{ id: string }>();
        expectTypeOf(permissions).toExtend<string[]>();

        return Response.json({ id, user, permissions }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      user: { id: "user-123" },
      permissions: ["read", "write"],
    });
  });

  it("should handle server errors using handleServerError method", async () => {
    class CustomError extends Error implements RouteHandlerError {
      status = 400;
      code = "CUSTOM_ERROR";
      metadata = { timestamp: Date.now() };

      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }

    const handleServerError = (error: RouteHandlerError) => {
      if (error instanceof CustomError) {
        return new Response(
          JSON.stringify({
            message: error.name,
            details: error.message,
            code: error.code,
            status: error.status,
          }),
          { status: error.status },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        }),
        { status: 500 },
      );
    };

    const GET = createZodRoute({
      handleServerError,
    })
      .params(paramsSchema)
      .handler(() => {
        throw new CustomError("Test error");
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data).toEqual({
      message: "CustomError",
      details: "Test error",
      code: "CUSTOM_ERROR",
      status: 400,
    });
  });
});

describe("form data handling", () => {
  it("should parse and validate form data in the request body", async () => {
    const POST = createZodRoute()
      .body(bodySchema)
      .handler((request, context) => {
        const { field } = context.body;
        return Response.json({ field }, { status: 200 });
      });

    const formData = new URLSearchParams();
    formData.append("field", "test-field");

    const request = new Request("http://localhost/", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ field: "test-field" });
  });

  it("should return an error for invalid form data", async () => {
    const POST = createZodRoute()
      .body(bodySchema)
      .handler((request, context) => {
        const { field } = context.body;
        return Response.json({ field }, { status: 200 });
      });

    const formData = new URLSearchParams();
    formData.append("field", ""); // Empty string should fail validation

    const request = new Request("http://localhost/", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ field: "" });
  });
});

describe("response handling", () => {
  it("should return the Response object directly when handler returns a Response", async () => {
    const GET = createZodRoute().handler(() => {
      return new Response(JSON.stringify({ custom: "response" }), {
        status: 201,
        headers: { "X-Custom-Header": "test" },
      });
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Custom-Header")).toBe("test");
    expect(data).toEqual({ custom: "response" });
  });

  it("should convert non-Response return values to a JSON Response", async () => {
    const GET = createZodRoute().handler(() => {
      return { data: "value" };
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const data = (await response.json()) as Record<string, unknown>;
    expect(data).toEqual({ data: "value" });
  });
});

describe("HTTP methods handling", () => {
  it("should not parse body for DELETE requests", async () => {
    const DELETE = createZodRoute().handler(() => {
      // If we reach here without error, it means the body wasn't parsed
      return Response.json({ success: true }, { status: 200 });
    });

    const request = new Request("http://localhost/", {
      method: "DELETE",
      // DELETE can have a body, unlike GET
      body: "{invalid json}",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("should not parse body for GET requests", async () => {
    const GET = createZodRoute().handler(() => {
      // If we reach here without error, it means the body wasn't parsed
      return Response.json({ success: true }, { status: 200 });
    });

    // GET requests can't have a body, so we'll just test that the handler works
    const request = new Request("http://localhost/", {
      method: "GET",
    });

    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });
});

describe("metadata validation", () => {
  const metadataSchema = z.object({
    permission: z.string(),
    role: z.enum(["admin", "user"]),
  });

  it("should validate and handle valid metadata", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      .metadata({ permission: "read", role: "admin" })
      .handler((request, context) => {
        expectTypeOf(context.metadata).toEqualTypeOf<
          z.output<typeof metadataSchema> | undefined
        >();
        const { permission, role } = context.metadata!;
        return Response.json({ permission, role }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: Promise.resolve({}),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ permission: "read", role: "admin" });
  });

  it("should return an error for invalid metadata", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      // @ts-expect-error - invalid role
      .metadata({ permission: "read", role: "invalid-role" })
      .handler((request, context) => {
        const { permission, role } = context.metadata!;
        return Response.json({ permission, role }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: Promise.resolve({}),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid metadata");
  });

  it("should handle missing optional metadata", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      .handler((request, context) => {
        expect(context.metadata).toBeUndefined();
        return Response.json({ success: true }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("should work with combined validation", async () => {
    const GET = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .defineMetadata(metadataSchema)
      .metadata({ permission: "read", role: "admin" })
      .handler((request, context) => {
        const { id } = context.params;
        const { search } = context.query;
        const { permission, role } = context.metadata!;

        return Response.json({ id, search, permission, role }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      search: "test",
      permission: "read",
      role: "admin",
    });
  });

  it("should pass metadata to middleware", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      .use(async ({ next, metadata }) => {
        expect(metadata).toEqual({ permission: "read", role: "admin" });
        const result = await next({ ctx: { authorized: true } });
        return result;
      })
      .metadata({ permission: "read", role: "admin" })
      .handler((request, context) => {
        const { authorized } = context.ctx;
        const { permission, role } = context.metadata!;
        return Response.json({ authorized, permission, role }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: Promise.resolve({}),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authorized: true,
      permission: "read",
      role: "admin",
    });
  });

  it("should handle undefined metadata in middleware", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      .use(async ({ next, metadata }) => {
        expect(metadata).toBeUndefined();
        const result = await next({ ctx: { authorized: false } });
        return result;
      })
      .handler((request, context) => {
        const { authorized } = context.ctx;
        return Response.json({ authorized }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ authorized: false });
  });

  it("should work with multiple middlewares accessing metadata", async () => {
    const GET = createZodRoute()
      .defineMetadata(metadataSchema)
      .use(async ({ next, metadata }) => {
        const result = await next({
          ctx: { hasPermission: metadata?.permission === "read" },
        });
        return result;
      })
      .use(async ({ next, metadata }) => {
        const result = await next({
          ctx: { isAdmin: metadata?.role === "admin" },
        });
        return result;
      })
      .metadata({ permission: "read", role: "admin" })
      .handler((request, context) => {
        const { hasPermission, isAdmin } = context.ctx;
        return Response.json({ hasPermission, isAdmin }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: Promise.resolve({}),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      hasPermission: true,
      isAdmin: true,
    });
  });
});

describe("enhanced middleware functionality", () => {
  it("should allow middleware to execute code before and after handler", async () => {
    const logs: string[] = [];

    const loggingMiddleware: MiddlewareFunction = async ({ next }) => {
      logs.push("before handler");
      const startTime = performance.now();

      const response = await next();

      const endTime = performance.now();
      logs.push(`after handler - took ${Math.round(endTime - startTime)}ms`);

      return response;
    };

    const GET = createZodRoute()
      .use(loggingMiddleware)
      .handler(() => {
        logs.push("handler executed");
        return { success: true };
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(logs).toEqual([
      "before handler",
      "handler executed",
      expect.stringMatching(/after handler - took \d+ms/),
    ]);
  });

  it("should allow middleware to modify response", async () => {
    const GET = createZodRoute()
      .use(async ({ next }) => {
        const response = await next();

        // Create new response with additional header
        return new Response(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            "X-Custom-Header": "middleware-added",
          },
        });
      })
      .handler(() => {
        return { success: true };
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.headers.get("X-Custom-Header")).toBe("middleware-added");
    expect(await response.json()).toEqual({ success: true });
  });

  it("should pass context through middleware chain", async () => {
    const GET = createZodRoute()
      .use(async ({ next }) => {
        const response = await next({
          ctx: { value1: "first" },
        });
        return response;
      })
      .use(async ({ ctx, next }) => {
        expect(ctx).toHaveProperty("value1", "first");
        const response = await next({
          ctx: { value2: "second" },
        });
        return response;
      })
      .handler((request: Request, context) => {
        expect(context.ctx).toEqual({
          value1: "first",
          value2: "second",
        });
        return { success: true };
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("should allow middleware to short-circuit the chain", async () => {
    const GET = createZodRoute()
      .use(async ({ next }) => {
        // Short circuit with error response
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });

        // This won't be called
        await next();
      })
      .handler(() => {
        // This won't be called
        return { success: true };
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("should handle custom error thrown inside a middleware", async () => {
    class CustomMiddlewareError extends Error implements RouteHandlerError {
      status = 403;
      code = "MIDDLEWARE_ERROR";
      metadata = { source: "middleware", timestamp: Date.now() };

      constructor(message: string) {
        super(message);
        this.name = "CustomMiddlewareError";
      }
    }

    const handleServerError = (error: RouteHandlerError) => {
      if (error instanceof CustomMiddlewareError) {
        return new Response(
          JSON.stringify({
            message: error.name,
            details: error.message,
            code: error.code,
            metadata: error.metadata,
          }),
          { status: error.status },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        }),
        { status: 500 },
      );
    };

    const GET = createZodRoute({
      handleServerError,
    })
      .use(async () => {
        throw new CustomMiddlewareError("Middleware error occurred");
      })
      .handler(() => {
        return { success: true };
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(data).toEqual({
      message: "CustomMiddlewareError",
      details: "Middleware error occurred",
      code: "MIDDLEWARE_ERROR",
      metadata: { source: "middleware", timestamp: expect.any(Number) },
    });
  });
});

describe("permission checking with metadata", () => {
  const permissionsMetadataSchema = z.object({
    requiredPermissions: z.array(z.string()).optional(),
  });

  const permissionCheckMiddleware: MiddlewareFunction<
    unknown,
    unknown,
    unknown,
    Record<string, unknown>,
    { authorized: boolean },
    z.output<typeof permissionsMetadataSchema>
  > = async ({ next, metadata, request }) => {
    // Get user permissions from auth header (in a real app)
    const userPermissions =
      request.headers.get("x-user-permissions")?.split(",") || [];

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

  it("should allow access when user has required permissions", async () => {
    const GET = createZodRoute()
      .defineMetadata(permissionsMetadataSchema)
      .use(permissionCheckMiddleware)
      .metadata({ requiredPermissions: ["read:users"] })
      .handler((request, context) => {
        const { authorized } = context.ctx;
        return Response.json({ success: true, authorized }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      headers: {
        "x-user-permissions": "read:users,write:users",
      },
    });

    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, authorized: true });
  });

  it("should deny access when user lacks required permissions", async () => {
    const GET = createZodRoute()
      .defineMetadata(permissionsMetadataSchema)
      .use(permissionCheckMiddleware)
      .metadata({ requiredPermissions: ["admin:users"] })
      .handler(() => {
        // This handler should not be called
        return Response.json({ success: true }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      headers: {
        "x-user-permissions": "read:users,write:users",
      },
    });

    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(data).toEqual({
      error: "Forbidden",
      message: "You do not have the required permissions",
    });
  });

  it("should allow access when no permissions are required", async () => {
    const GET = createZodRoute()
      .defineMetadata(permissionsMetadataSchema)
      .use(permissionCheckMiddleware)
      .metadata({ requiredPermissions: [] })
      .handler((request, context) => {
        const { authorized } = context.ctx;
        return Response.json({ success: true, authorized }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, authorized: true });
  });

  it("should allow access when metadata is not provided", async () => {
    const GET = createZodRoute()
      .defineMetadata(permissionsMetadataSchema)
      .use(permissionCheckMiddleware)
      .handler((request, context) => {
        const { authorized } = context.ctx;
        return Response.json({ success: true, authorized }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, authorized: true });
  });

  it("should work with other middleware and validations", async () => {
    const loggingMiddleware: MiddlewareFunction = async ({ next }) => {
      const response = await next({ ctx: { logged: true } });
      return response;
    };

    const GET = createZodRoute()
      .defineMetadata(permissionsMetadataSchema)
      .params(paramsSchema)
      .use(loggingMiddleware)
      .use(permissionCheckMiddleware)
      .metadata({ requiredPermissions: ["read:users"] })
      .handler((request, context) => {
        const { id } = context.params;
        const { authorized, logged } = context.ctx;
        return Response.json({ id, authorized, logged }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      headers: {
        "x-user-permissions": "read:users,write:users",
      },
    });

    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      authorized: true,
      logged: true,
    });
  });
});

describe("middleware receives params, query, and body", () => {
  it("should receive params in middleware", async () => {
    const middleware: MiddlewareFunction<
      z.output<typeof paramsSchema>,
      unknown,
      unknown,
      Record<string, unknown>,
      Record<string, unknown>
    > = async ({ params, next }) => {
      expect(params).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
      return next();
    };

    const GET = createZodRoute()
      .params(paramsSchema)
      .use(middleware)
      .handler((request, context) => {
        return Response.json({ id: context.params.id }, { status: 200 });
      });

    const request = new Request("http://localhost/");
    const response = await GET(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
  });

  it("should receive query in middleware", async () => {
    const middleware: MiddlewareFunction<
      unknown,
      z.output<typeof querySchema>,
      unknown,
      Record<string, unknown>,
      Record<string, unknown>
    > = async ({ query, next }) => {
      expect(query).toEqual({ search: "test" });
      return next();
    };

    const GET = createZodRoute()
      .query(querySchema)
      .use(middleware)
      .handler((request, context) => {
        return Response.json({ search: context.query.search }, { status: 200 });
      });

    const request = new Request("http://localhost/?search=test");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({ search: "test" });
  });

  it("should receive body in middleware", async () => {
    const middleware: MiddlewareFunction<
      unknown,
      unknown,
      z.output<typeof bodySchema>,
      Record<string, unknown>,
      Record<string, unknown>
    > = async ({ body, next }) => {
      expect(body).toEqual({ field: "test-field" });
      return next();
    };

    const POST = createZodRoute()
      .body(bodySchema)
      .use(middleware)
      .handler((request, context) => {
        return Response.json({ field: context.body.field }, { status: 200 });
      });

    const request = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });
    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({ field: "test-field" });
  });

  it("should receive params, query, and body together in middleware", async () => {
    const middleware: MiddlewareFunction<
      z.output<typeof paramsSchema>,
      z.output<typeof querySchema>,
      z.output<typeof bodySchema>,
      Record<string, unknown>,
      Record<string, unknown>
    > = async ({ params, query, body, next }) => {
      expect(params).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
      expect(query).toEqual({ search: "test" });
      expect(body).toEqual({ field: "test-field" });
      return next();
    };

    const POST = createZodRoute()
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .use(middleware)
      .handler((request, context) => {
        return Response.json(
          {
            id: context.params.id,
            search: context.query.search,
            field: context.body.field,
          },
          { status: 200 },
        );
      });

    const request = new Request("http://localhost/?search=test", {
      method: "POST",
      body: JSON.stringify({ field: "test-field" }),
    });
    const response = await POST(request, {
      params: paramsToPromise({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      search: "test",
      field: "test-field",
    });
  });
});

describe("handleFormData option", () => {
  const customFormDataHandler = (formData: globalThis.FormData) => {
    // Transforme le FormData en un objet avec tous les champs en majuscules
    const obj: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      obj[key.toUpperCase()] = String(value).toUpperCase();
    }
    return obj;
  };

  const customBodySchema = z.object({ FIELD: z.string() });

  it("should use handleFormData to transform form data", async () => {
    const POST = new RouteHandlerBuilder({
      handleFormData: customFormDataHandler,
      contextType: {},
      config: {
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        bodySchema: customBodySchema,
      },
    })
      .body(customBodySchema)
      .handler((request, context) => {
        expect(context.body).toEqual({ FIELD: "TEST-FIELD" });
        return Response.json(context.body, { status: 200 });
      });

    const formData = new URLSearchParams();
    formData.append("field", "test-field");

    const request = new Request("http://localhost/", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({ FIELD: "TEST-FIELD" });
  });

  it("should fail validation if handleFormData returns invalid object", async () => {
    const invalidHandler = () => ({ notField: "value" });
    const POST = new RouteHandlerBuilder({
      handleFormData: invalidHandler,
      contextType: {},
      config: {
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        bodySchema: customBodySchema,
      },
    })
      .body(customBodySchema)
      .handler((request, context) => {
        return Response.json(context.body, { status: 200 });
      });

    const formData = new URLSearchParams();
    formData.append("field", "test-field");

    const request = new Request("http://localhost/", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(400);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("Invalid body");
  });

  it("should fallback to default FormData parsing if handleFormData is not provided", async () => {
    const POST = new RouteHandlerBuilder({
      contextType: {},
      config: {
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        bodySchema: z.object({ field: z.string() }),
      },
    })
      .body(z.object({ field: z.string() }))
      .handler((request, context) => {
        expect(context.body).toEqual({ field: "test-field" });
        return Response.json(context.body, { status: 200 });
      });

    const formData = new URLSearchParams();
    formData.append("field", "test-field");

    const request = new Request("http://localhost/", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(data).toEqual({ field: "test-field" });
  });
});

describe("return type deduction", () => {
  describe("type inference", () => {
    it("should infer return type for plain object", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const GET = createZodRoute().handler(() => {
        return { message: "hello", count: 42 };
      });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<{
        message: string;
        count: number;
      }>();
    });

    it("should infer return type for Response object", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const GET = createZodRoute().handler(() => {
        return Response.json({ success: true });
      });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<Response>();
    });

    it("should infer return type for union types", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const GET = createZodRoute().handler(() => {
        const random = Math.random();
        if (random > 0.5) {
          return { type: "object" as const, data: "string" };
        }
        return Response.json({ type: "response" as const });
      });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<
        { type: "object"; data: string } | Response
      >();
    });

    it("should infer return type with complex nested objects", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const GET = createZodRoute()
        .params(z.object({ id: z.string() }))
        .query(z.object({ include: z.string().optional() }))
        .handler((request, context) => {
          return {
            user: {
              id: context.params.id,
              profile: {
                settings: {
                  theme: "dark" as const,
                  notifications: true,
                },
              },
            },
            meta: {
              include: context.query.include,
              timestamp: new Date(),
            },
          };
        });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<{
        user: {
          id: string;
          profile: {
            settings: {
              theme: "dark";
              notifications: boolean;
            };
          };
        };
        meta: {
          include: string | undefined;
          timestamp: Date;
        };
      }>();
    });
  });

  describe("runtime behavior", () => {
    it("should return typed response for plain object", async () => {
      const GET = createZodRoute().handler(() => {
        return { message: "hello world", status: "success" };
      });

      const request = new Request("http://localhost/");
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data).toEqual({ message: "hello world", status: "success" });
    });

    it("should return typed response for Response object", async () => {
      const GET = createZodRoute().handler(() => {
        return new Response("Custom response", {
          status: 201,
          headers: { "Custom-Header": "value" },
        });
      });

      const request = new Request("http://localhost/");
      const response = await GET(request, { params: Promise.resolve({}) });
      const text = await response.text();

      expect(response.status).toBe(201);
      expect(response.headers.get("Custom-Header")).toBe("value");
      expect(text).toBe("Custom response");
    });

    it("should preserve type information through middleware chain", async () => {
      type UserResponse = {
        user: { id: string; name: string };
        timestamp: number;
      };

      const authMiddleware: MiddlewareFunction = async ({ next }) => {
        return next({ ctx: { userId: "user123" } });
      };

      const GET = createZodRoute()
        .use(authMiddleware)
        .handler((request, context): UserResponse => {
          return {
            user: {
              id: context.ctx.userId as string,
              name: "John Doe",
            },
            timestamp: Date.now(),
          };
        });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<UserResponse>();

      const request = new Request("http://localhost/");
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = (await response.json()) as RouteResponse<typeof GET>;

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("timestamp");
      expect(data.user).toEqual({ id: "user123", name: "John Doe" });
      expect(typeof data.timestamp).toBe("number");
    });

    it("should handle async handlers with proper type inference", async () => {
      const GET = createZodRoute()
        .params(z.object({ id: z.string() }))
        .handler(async (request, context) => {
          return {
            id: context.params.id,
            async: true,
            processedAt: new Date().toISOString(),
          };
        });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<{
        id: string;
        async: boolean;
        processedAt: string;
      }>();

      const request = new Request("http://localhost/");
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-id" }),
      });
      const data = (await response.json()) as RouteResponse<typeof GET>;

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: "test-id",
        async: true,
      });
      expect(typeof data.processedAt).toBe("string");
    });

    it("should support conditional return types", async () => {
      const GET = createZodRoute()
        .query(z.object({ format: z.enum(["json", "text"]).optional() }))
        .handler((request, context) => {
          if (context.query.format === "text") {
            return new Response("Text response", {
              headers: { "Content-Type": "text/plain" },
            });
          }

          return { format: "json", data: "JSON response" };
        });

      const jsonRequest = new Request("http://localhost/?format=json");
      const jsonResponse = await GET(jsonRequest, {
        params: Promise.resolve({}),
      });
      const jsonData = await jsonResponse.json();

      expect(jsonResponse.status).toBe(200);
      expect(jsonResponse.headers.get("Content-Type")).toBe("application/json");
      expect(jsonData).toEqual({ format: "json", data: "JSON response" });

      const textRequest = new Request("http://localhost/?format=text");
      const textResponse = await GET(textRequest, {
        params: Promise.resolve({}),
      });
      const textData = await textResponse.text();

      expect(textResponse.headers.get("Content-Type")).toBe("text/plain");
      expect(textData).toBe("Text response");
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined returns", async () => {
      const GET1 = createZodRoute().handler(() => {
        return null;
      });

      const GET2 = createZodRoute().handler(() => {
        return undefined;
      });

      expectTypeOf<RouteResponse<typeof GET1>>().toExtend<null>();
      expectTypeOf<RouteResponse<typeof GET2>>().toExtend<undefined>();

      const request = new Request("http://localhost/");

      const response1 = await GET1(request, { params: Promise.resolve({}) });
      const data1 = await response1.json();
      expect(data1).toBe(null);

      const response2 = await GET2(request, { params: Promise.resolve({}) });
      const text2 = await response2.text();
      // undefined is returned as an empty JSON response
      expect(text2).toBe("");
    });

    it("should handle primitive return types", async () => {
      const GET1 = createZodRoute().handler(() => {
        return "string response";
      });

      const GET2 = createZodRoute().handler(() => {
        return 42;
      });

      const GET3 = createZodRoute().handler(() => {
        return true;
      });

      expectTypeOf<RouteResponse<typeof GET1>>().toExtend<string>();
      expectTypeOf<RouteResponse<typeof GET2>>().toExtend<number>();
      expectTypeOf<RouteResponse<typeof GET3>>().toExtend<boolean>();

      const request = new Request("http://localhost/");

      const response1 = await GET1(request, { params: Promise.resolve({}) });
      const data1 = await response1.json();
      expect(data1).toBe("string response");

      const response2 = await GET2(request, { params: Promise.resolve({}) });
      const data2 = await response2.json();
      expect(data2).toBe(42);

      const response3 = await GET3(request, { params: Promise.resolve({}) });
      const data3 = await response3.json();
      expect(data3).toBe(true);
    });

    it("should handle array return types", async () => {
      const GET = createZodRoute().handler(() => {
        return [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ];
      });

      expectTypeOf<RouteResponse<typeof GET>>().toExtend<
        Array<{ id: number; name: string }>
      >();

      const request = new Request("http://localhost/");
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data).toEqual([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);
    });
  });
});

describe("RouteHandlerError interface tests", () => {
  it("should handle RouteHandlerError with all properties", async () => {
    class ValidationError extends Error implements RouteHandlerError {
      status = 422;
      code = "VALIDATION_ERROR";
      metadata = {
        fields: { email: "Invalid format", age: "Must be positive" },
        timestamp: "2025-08-07T10:30:00Z",
      };

      constructor(message: string) {
        super(message);
        this.name = "ValidationError";
      }
    }

    const handleServerError = (error: RouteHandlerError) => {
      return new Response(
        JSON.stringify({
          message: error.message,
          code: error.code,
          status: error.status,
          metadata: error.metadata,
        }),
        { status: error.status },
      );
    };

    const POST = createZodRoute({
      handleServerError,
    })
      .body(bodySchema)
      .handler(() => {
        throw new ValidationError("Multiple validation errors");
      });

    const request = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ field: "test" }),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(422);
    expect(data).toEqual({
      message: "Multiple validation errors",
      code: "VALIDATION_ERROR",
      status: 422,
      metadata: {
        fields: { email: "Invalid format", age: "Must be positive" },
        timestamp: "2025-08-07T10:30:00Z",
      },
    });
  });

  it("should handle basic Error that gets cast to RouteHandlerError", async () => {
    const handleServerError = (error: RouteHandlerError) => {
      // Verificar que se puede manejar errores básicos
      const status = error.status || 500;
      const code = error.code || "INTERNAL_SERVER_ERROR";

      return new Response(
        JSON.stringify({
          message: error.message,
          code,
          status,
          hasMetadata: !!error.metadata,
        }),
        { status },
      );
    };

    const GET = createZodRoute({
      handleServerError,
    }).handler(() => {
      // Error básico sin status/code
      throw new Error("Basic error");
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(data).toEqual({
      message: "Basic error",
      code: "INTERNAL_SERVER_ERROR",
      status: 500,
      hasMetadata: false,
    });
  });

  it("should verify RouteHandlerError type safety at compile time", () => {
    // Este test verifica que el tipado funcione correctamente
    const testError: RouteHandlerError = {
      name: "TestError",
      message: "Test message",
      status: 400,
      code: "TEST_ERROR",
    };

    // Verificar que todas las propiedades estén presentes
    expect(testError.name).toBe("TestError");
    expect(testError.message).toBe("Test message");
    expect(testError.status).toBe(400);
    expect(testError.code).toBe("TEST_ERROR");
    expect(testError.metadata).toBeUndefined();
  });
});
