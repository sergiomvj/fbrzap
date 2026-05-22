import { FastifyInstance } from "fastify";
import { listAgents } from "../lib/openclaw.js";

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/agents", async () => {
    return listAgents();
  });
}

