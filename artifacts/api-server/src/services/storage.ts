import { createHash } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "../server/storage/r2Client";
import { storePrivateFile } from "../server/storage/fileVault";

export interface StoredObject {
  provider: string;
  bucket: string | null;
  region: string | null;
  key: string | null;
  url: string | null;
  checksumSha256: string;
  sizeBytes: number;
}

export interface UploadFileLike {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size: number;
}

function storageProvider(): string {
  const r2 = getR2Config();
  if (r2.configured) return "r2";
  return (process.env.STORAGE_PROVIDER ?? "metadata_only").toLowerCase();
}

function objectKey(input: { companyId: number; sourceType: string; fileName: string }) {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `companies/${input.companyId}/uploads/${input.sourceType}/${stamp}-${safeName || "upload"}`;
}

function configuredBucket(): string | null {
  return process.env.CLOUDFLARE_R2_BUCKET ?? process.env.STORAGE_BUCKET ?? process.env.S3_BUCKET ?? process.env.R2_BUCKET ?? process.env.GCS_BUCKET ?? null;
}

function configuredRegion(): string | null {
  return process.env.STORAGE_REGION ?? process.env.AWS_REGION ?? "auto";
}

function storageEndpoint(): string | undefined {
  return process.env.CLOUDFLARE_R2_ENDPOINT ?? process.env.STORAGE_ENDPOINT ?? process.env.S3_ENDPOINT ?? process.env.R2_ENDPOINT ?? process.env.GCS_ENDPOINT;
}

function publicUrl(bucket: string, key: string): string | null {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? process.env.STORAGE_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  return null;
}

function makeS3Client() {
  const endpoint = storageEndpoint();
  const region = configuredRegion() ?? "auto";
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? process.env.STORAGE_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? process.env.STORAGE_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true" || Boolean(endpoint),
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
}

export function retentionUntil(days: number | null | undefined): Date | null {
  if (!days || days <= 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function storeUploadedFile(input: {
  companyId: number;
  sourceType: string;
  file: UploadFileLike;
}): Promise<StoredObject> {
  const checksumSha256 = createHash("sha256").update(input.file.buffer).digest("hex");
  const provider = storageProvider();
  const bucket = configuredBucket();
  const region = configuredRegion();

  if (provider === "metadata_only" || !bucket) {
    return {
      provider: bucket ? provider : "metadata_only",
      bucket: bucket ?? null,
      region,
      key: null,
      url: null,
      checksumSha256,
      sizeBytes: input.file.size,
    };
  }

  if (!["s3", "r2", "gcs"].includes(provider)) {
    throw new Error(`Unsupported STORAGE_PROVIDER "${provider}". Use metadata_only, s3, r2, or gcs.`);
  }

  if (provider === "r2" && getR2Config().configured) {
    const stored = await storePrivateFile({
      companyId: input.companyId,
      sourceType: input.sourceType,
      file: input.file,
    });
    return {
      provider: stored.provider,
      bucket: stored.bucket,
      region: stored.region,
      key: stored.key,
      url: null,
      checksumSha256: stored.checksumSha256,
      sizeBytes: stored.sizeBytes,
    };
  }

  const key = objectKey({ companyId: input.companyId, sourceType: input.sourceType, fileName: input.file.originalname });
  const client = makeS3Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: input.file.buffer,
    ContentType: input.file.mimetype || "application/octet-stream",
    Metadata: {
      companyId: String(input.companyId),
      sourceType: input.sourceType,
      checksumSha256,
    },
  }));

  return {
    provider,
    bucket,
    region,
    key,
    url: publicUrl(bucket, key),
    checksumSha256,
    sizeBytes: input.file.size,
  };
}

export async function deleteStoredObject(input: {
  provider: string;
  bucket?: string | null;
  key?: string | null;
}) {
  if (!input.bucket || !input.key || input.provider === "metadata_only") return { deletedRemote: false };
  if (!["s3", "r2", "gcs"].includes(input.provider)) return { deletedRemote: false };
  const client = makeS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }));
  return { deletedRemote: true };
}
