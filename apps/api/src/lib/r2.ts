import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import crypto from "crypto";
import path from "path";

const s3Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

export async function uploadToR2(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const ext = path.extname(filename) || ".bin";
  const hash = crypto.randomBytes(16).toString("hex");
  
  let folder = "misc";
  if (mimeType.startsWith("image/")) {
    folder = "images";
  } else if (mimeType.startsWith("audio/")) {
    folder = "audios";
  }

  const objectKey = `${folder}/${hash}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: mimeType
    })
  );

  return `${env.R2_PUBLIC_URL}/${objectKey}`;
}
