import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";
import fs from "node:fs";

// No container Docker o CWD é /app (raiz do monorepo).
// Localmente com npm workspaces o CWD é apps/api.
// Tentamos a raiz primeiro, depois dois níveis acima.
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
];
const envPath = candidates.find((p) => fs.existsSync(p));
if (envPath) config({ path: envPath });

const envSchema = z.object({
  APP_ENV: z.string().default("local"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENCLAW_BASE_URL: z.string().url(),
  OPENCLAW_API_KEY: z.string(),
  OPENCLAW_TIMEOUT_MS: z.coerce.number().default(60000),
  OPENCLAW_RETRY_ATTEMPTS: z.coerce.number().default(3),
  
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url()
});

export const env = envSchema.parse(process.env);
