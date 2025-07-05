import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

const openApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Identity Reconciliation API",
    version: "1.0.0",
    description:
      "An API that reconciles user identity based on phone number and email.",
  },
  paths: {
    "/identify": {
      post: {
        summary: "Identify and reconcile user contact",
        description:
          "Accepts a user's phone number and/or email, checks existing records, and returns the primary and secondary contact trail.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phoneNumber: {
                    type: "string",
                    example: "9876543210",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "example@email.com",
                  },
                },
                required: [],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reconciled contact information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    contact: {
                      type: "object",
                      properties: {
                        primaryContactId: {
                          type: "integer",
                          example: 1,
                        },
                        emails: {
                          type: "array",
                          items: {
                            type: "string",
                            format: "email",
                          },
                          example: ["a@example.com", "b@example.com"],
                        },
                        phoneNumbers: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                          example: ["9876543210", "8765432109"],
                        },
                        secondaryContactIds: {
                          type: "array",
                          items: {
                            type: "integer",
                          },
                          example: [2, 3],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Please provide email or phoneNumber",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const app = new Hono();

app.get("/doc", (c) => c.json(openApiDoc));

app.get("/ui", swaggerUI({ url: "/swagger/doc" }));

app.get("/health", (c) => c.text("OK"));

export default app;
