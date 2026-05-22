import { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => ({
    name: "FBRzap API",
    version: "0.1.0",
    status: "online"
  }));

  app.get("/health/live", async () => ({
    ok: true
  }));

  app.get("/health/ready", async () => ({
    ok: true,
    dependencies: {
      supabase: "configured",
      openclaw: "configured"
    }
  }));
}

