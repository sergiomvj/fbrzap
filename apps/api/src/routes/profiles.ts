import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getProfile, updateProfile } from "../lib/fbrzap-repository.js";
import { getRequestContext } from "../lib/request-context.js";

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/profiles/me", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      const profile = await getProfile(context.userId);

      if (!profile) {
        return reply.status(404).send({ ok: false, error: "profile_not_found" });
      }

      return {
        ok: true,
        profile
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ ok: false, error: "failed_to_get_profile" });
    }
  });

  app.patch("/v1/profiles/me", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      
      const bodyParams = z.object({
        display_name: z.string().min(1).optional(),
        avatar_url: z.string().url().optional(),
        phone: z.string().optional()
      });

      const body = bodyParams.parse(request.body);

      const profile = await updateProfile(context.userId, body);

      return {
        ok: true,
        profile
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ ok: false, error: "failed_to_update_profile" });
    }
  });
}
