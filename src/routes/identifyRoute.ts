import { Hono } from "hono";
import { identifyController } from "../controllers";

const app = new Hono();

app.post("/", (c) => identifyController.identify(c));

export default app;
