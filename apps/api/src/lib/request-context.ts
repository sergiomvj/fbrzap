import { FastifyRequest } from "fastify";

import { supabaseAdmin } from "./supabase.js";

export type RequestContext = {
  userId: string;
  orgSlug?: string;
};

export async function getRequestContext(request: FastifyRequest): Promise<RequestContext> {
  let userId = request.headers["x-user-id"] as string | undefined;
  const orgSlug = request.headers["x-org-slug"] as string | undefined;

  const authHeader = request.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      userId = user.id;
    }
  }

  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Unauthorized");
  }

  return {
    userId,
    orgSlug: typeof orgSlug === "string" && orgSlug.length > 0 ? orgSlug : undefined
  };
}

