import Fastify from "fastify";
import cors from "@fastify/cors";
import { agentRoutes } from "./routes/agents.js";
import { chatRoutes } from "./routes/chats.js";
import { healthRoutes } from "./routes/health.js";
import { uploadRoutes } from "./routes/uploads.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(healthRoutes);
  await app.register(agentRoutes);
  await app.register(chatRoutes);
  await app.register(uploadRoutes);

  return app;
}

