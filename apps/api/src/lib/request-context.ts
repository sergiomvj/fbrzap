import { FastifyRequest } from "fastify";

export type RequestContext = {
  userId: string;
  orgSlug?: string;
};

export function getRequestContext(request: FastifyRequest): RequestContext {
  const userId = request.headers["x-user-id"];
  const orgSlug = request.headers["x-org-slug"];

  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Missing x-user-id header");
  }

  return {
    userId,
    orgSlug: typeof orgSlug === "string" && orgSlug.length > 0 ? orgSlug : undefined
  };
}

