import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Determina a raiz do projeto FBRzap (onde fica o .env original) subindo duas pastas do CWD do npm
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
config({ path: rootEnvPath });

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
