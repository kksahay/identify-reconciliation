import type { Hono, Env } from "hono";
import type { BlankSchema } from "hono/types";
import identifyRoute from "./identifyRoute";
import swaggerRoute from "./swaggerRoute";

export interface RouterMW {
  path: string;
  router: Hono<Env, BlankSchema, "/">;
}

export const routers: RouterMW[] = [
  {
    path: "/api/identify",
    router: identifyRoute,
  },
  {
    path: "/swagger",
    router: swaggerRoute,
  },
];
