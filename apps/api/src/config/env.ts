import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.string().default("local"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENCLAW_BASE_URL: z.string().url(),
  OPENCLAW_API_KEY: z.string().min(1),
  OPENCLAW_TIMEOUT_MS: z.string().default("60000"),
  OPENCLAW_RETRY_ATTEMPTS: z.string().default("3")
});

export const env = envSchema.parse(process.env);

