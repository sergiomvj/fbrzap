import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import multipart from "@fastify/multipart";
import { uploadToR2 } from "../lib/r2.js";
import { getRequestContext } from "../lib/request-context.js";

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024 // 20 MB limit
    }
  });

  app.post("/v1/uploads", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = await getRequestContext(request);
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ ok: false, error: "No file uploaded" });
      }

      const buffer = await data.toBuffer();
      const url = await uploadToR2(buffer, data.filename, data.mimetype);

      return reply.send({
        ok: true,
        url,
        mimetype: data.mimetype,
        filename: data.filename
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ ok: false, error: "Upload failed" });
    }
  });
}
