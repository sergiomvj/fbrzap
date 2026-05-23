import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentRoutes } from "./routes/agents.js";
import { chatRoutes } from "./routes/chats.js";
import { healthRoutes } from "./routes/health.js";
import { uploadRoutes } from "./routes/uploads.js";
import { profileRoutes } from "./routes/profiles.js";

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
  await app.register(profileRoutes);

  // Serve the frontend web app build
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Try to find the dist folder, in Docker it will be at /app/apps/mobile/dist
  // Locally it will be at ../../../mobile/dist
  const distPath = path.resolve(__dirname, "../../../mobile/dist");

  await app.register(fastifyStatic, {
    root: distPath,
    wildcard: false, // Don't override API routes
    prefix: "/",
  });

  // Fallback for React Router (SPA)
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      reply.status(404).send({ error: "Not found" });
    } else {
      reply.sendFile("index.html");
    }
  });

  return app;
}

