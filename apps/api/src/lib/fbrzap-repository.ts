import { supabaseAdmin } from "./supabase.js";

type CreateChatInput =
  | {
      type: "dm_agent";
      createdBy: string;
      orgSlug?: string;
      agentId: string;
    }
  | {
      type: "group";
      createdBy: string;
      orgSlug?: string;
      title: string;
      memberIds: string[];
    };

export async function listChatsForUser(userId: string) {
  const membership = await supabaseAdmin
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", userId);

  if (membership.error) {
    throw membership.error;
  }

  const chatIds = membership.data.map((item) => item.chat_id);

  if (chatIds.length === 0) {
    return [];
  }

  const chats = await supabaseAdmin
    .from("chats")
    .select("*")
    .in("id", chatIds)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (chats.error) {
    throw chats.error;
  }

  return chats.data;
}

export async function getChatForUser(chatId: string, userId: string) {
  const membership = await supabaseAdmin
    .from("chat_members")
    .select("chat_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership.error) {
    throw membership.error;
  }

  if (!membership.data) {
    return null;
  }

  const chat = await supabaseAdmin
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle();

  if (chat.error) {
    throw chat.error;
  }

  return chat.data;
}

export async function createChat(input: CreateChatInput) {
  if (input.type === "dm_agent") {
    const existing = await supabaseAdmin
      .from("chats")
      .select("*")
      .eq("type", "dm_agent")
      .eq("created_by", input.createdBy)
      .eq("agent_id", input.agentId)
      .maybeSingle();

    if (existing.error) {
      throw existing.error;
    }

    if (existing.data) {
      return existing.data;
    }

    const inserted = await supabaseAdmin
      .from("chats")
      .insert({
        type: "dm_agent",
        created_by: input.createdBy,
        org_slug: input.orgSlug ?? "default",
        agent_id: input.agentId
      })
      .select("*")
      .single();

    if (inserted.error) {
      throw inserted.error;
    }

    await ensureMembership(inserted.data.id, input.createdBy, "owner");
    return inserted.data;
  }

  const inserted = await supabaseAdmin
    .from("chats")
    .insert({
      type: "group",
      title: input.title,
      created_by: input.createdBy,
      org_slug: input.orgSlug ?? "default"
    })
    .select("*")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  const memberIds = Array.from(new Set([input.createdBy, ...input.memberIds]));
  await Promise.all(memberIds.map((memberId) => ensureMembership(inserted.data.id, memberId, memberId === input.createdBy ? "owner" : "member")));
  return inserted.data;
}

export async function listMessagesForChat(chatId: string, userId: string) {
  const chat = await getChatForUser(chatId, userId);

  if (!chat) {
    return null;
  }

  const messages = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (messages.error) {
    throw messages.error;
  }

  return messages.data;
}

export async function createUserMessage(input: {
  chatId: string;
  userId: string;
  content: string;
  clientMessageId: string;
  mentions: string[];
  attachments?: string[];
}) {
  const inserted = await supabaseAdmin
    .from("messages")
    .insert({
      chat_id: input.chatId,
      direction: "inbound_user",
      sender_user_id: input.userId,
      content: input.content,
      client_message_id: input.clientMessageId,
      mentions: input.mentions,
      attachments: input.attachments ?? []
    })
    .select("*")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  await updateChatLastMessage(input.chatId, input.content);
  return inserted.data;
}

export async function createAgentMessage(input: {
  chatId: string;
  agentId: string;
  content: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const inserted = await supabaseAdmin
    .from("messages")
    .insert({
      chat_id: input.chatId,
      direction: "outbound_agent",
      sender_agent_id: input.agentId,
      content: input.content,
      request_id: input.requestId,
      status: "replied",
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  await updateChatLastMessage(input.chatId, input.content);
  return inserted.data;
}

async function ensureMembership(chatId: string, userId: string, role: "owner" | "member" | "admin") {
  const result = await supabaseAdmin
    .from("chat_members")
    .upsert({
      chat_id: chatId,
      user_id: userId,
      role
    });

  if (result.error) {
    throw result.error;
  }
}

async function updateChatLastMessage(chatId: string, content: string) {
  const result = await supabaseAdmin
    .from("chats")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 140)
    })
    .eq("id", chatId);

  if (result.error) {
    throw result.error;
  }
}

