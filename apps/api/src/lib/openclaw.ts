import { env } from "../config/env.js";

type OpenClawChatPayload = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  channel_id: string;
  request_id: string;
  metadata: {
    source: "fbrzap";
    chat_id: string;
    user_id: string;
    org_slug?: string;
  };
};

export async function listAgents(): Promise<unknown> {
  const response = await fetch(new URL("/api/agents", env.OPENCLAW_BASE_URL), {
    headers: {
      Authorization: `ApiKey ${env.OPENCLAW_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load agents: ${response.status}`);
  }

  return response.json();
}

export async function sendAgentMessage(agentId: string, payload: OpenClawChatPayload): Promise<unknown> {
  const response = await fetch(new URL(`/api/chat/${agentId}`, env.OPENCLAW_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${env.OPENCLAW_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to send agent message: ${response.status}`);
  }

  return response.json();
}

