import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createAgentMessage,
  createChat,
  createUserMessage,
  getChatForUser,
  listChatsForUser,
  listMessagesForChat
} from "../lib/fbrzap-repository.js";
import { getRequestContext } from "../lib/request-context.js";
import { sendAgentMessage } from "../lib/openclaw.js";

const chatMessageSchema = z.object({
  content: z.string().min(1),
  client_message_id: z.string().uuid(),
  mentions: z.array(z.string()).default([])
});

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/chats", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      const chats = await listChatsForUser(context.userId);

      return {
        ok: true,
        chats
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ ok: false, error: "failed_to_list_chats" });
    }
  });

  app.post("/v1/chats", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      const body = z.discriminatedUnion("type", [
        z.object({
          type: z.literal("dm_agent"),
          agent_id: z.string().min(1)
        }),
        z.object({
          type: z.literal("group"),
          title: z.string().min(2),
          member_ids: z.array(z.string().uuid()).default([])
        })
      ]).parse(request.body);

      const chat =
        body.type === "dm_agent"
          ? await createChat({
              type: "dm_agent",
              createdBy: context.userId,
              orgSlug: context.orgSlug,
              agentId: body.agent_id
            })
          : await createChat({
              type: "group",
              createdBy: context.userId,
              orgSlug: context.orgSlug,
              title: body.title,
              memberIds: body.member_ids
            });

      return {
        ok: true,
        chat
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ ok: false, error: "failed_to_create_chat" });
    }
  });

  app.get("/v1/chats/:chatId/messages", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      const params = z.object({ chatId: z.string().uuid().or(z.string().min(1)) }).parse(request.params);
      const messages = await listMessagesForChat(params.chatId, context.userId);

      if (!messages) {
        return reply.status(404).send({ ok: false, error: "chat_not_found" });
      }

      return {
        ok: true,
        messages
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ ok: false, error: "failed_to_list_messages" });
    }
  });

  app.post("/v1/chats/:chatId/messages", async (request, reply) => {
    try {
      const context = getRequestContext(request);
      const params = z.object({ chatId: z.string().uuid().or(z.string().min(1)) }).parse(request.params);
      const body = chatMessageSchema.parse(request.body);
      const chat = await getChatForUser(params.chatId, context.userId);

      if (!chat) {
        return reply.status(404).send({ ok: false, error: "chat_not_found" });
      }

      const userMessage = await createUserMessage({
        chatId: params.chatId,
        userId: context.userId,
        content: body.content,
        clientMessageId: body.client_message_id,
        mentions: body.mentions
      });

      let agentReply: unknown = null;

      if (chat.type === "dm_agent" && chat.agent_id) {
        const requestId = randomUUID();
        
        const rawHistory = await listMessagesForChat(params.chatId, context.userId);
        const history = (rawHistory || [])
          .filter(m => m.id !== userMessage.id)
          .slice(-10)
          .filter(m => m.direction === "inbound_user" || m.direction === "outbound_agent")
          .map(m => ({
            role: (m.direction === "inbound_user" ? "user" : "assistant") as "user" | "assistant",
            content: m.content
          }));

        const openClawReply = await sendAgentMessage(chat.agent_id, {
          message: body.content,
          history: history,
          channel_id: `fbrzap:${params.chatId}`,
          request_id: requestId,
          metadata: {
            source: "fbrzap",
            chat_id: params.chatId,
            user_id: context.userId,
            org_slug: context.orgSlug
          }
        });

        const replyText =
          typeof openClawReply === "object" &&
          openClawReply !== null &&
          "reply" in openClawReply &&
          typeof (openClawReply as any).reply === "string"
            ? (openClawReply as any).reply
            : "Agente respondeu sem payload textual padrao.";

        agentReply = await createAgentMessage({
          chatId: params.chatId,
          agentId: chat.agent_id,
          content: replyText,
          requestId,
          metadata: (typeof openClawReply === "object" && openClawReply !== null ? openClawReply : {}) as Record<string, unknown>
        });
      }

      return {
        ok: true,
        message_id: userMessage.id,
        status: "accepted",
        chat_id: params.chatId,
        agent_reply: agentReply
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ ok: false, error: "failed_to_send_message" });
    }
  });

  app.post("/v1/agents/:agentId/messages", async (request) => {
    const params = z.object({
      agentId: z.string().min(1)
    }).parse(request.params);

    const body = z.object({
      chat_id: z.string().uuid().or(z.string().min(1)),
      user_id: z.string().uuid().or(z.string().min(1)),
      org_slug: z.string().optional(),
      content: z.string().min(1),
      history: z.array(
        z.object({
          role: z.union([z.literal("user"), z.literal("assistant")]),
          content: z.string()
        })
      ).default([])
    }).parse(request.body);

    const requestId = randomUUID();

    const reply = await sendAgentMessage(params.agentId, {
      message: body.content,
      history: body.history,
      channel_id: `fbrzap:${body.chat_id}`,
      request_id: requestId,
      metadata: {
        source: "fbrzap",
        chat_id: body.chat_id,
        user_id: body.user_id,
        org_slug: body.org_slug
      }
    });

    return {
      ok: true,
      request_id: requestId,
      reply
    };
  });
}
