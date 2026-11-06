export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
  BASE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  MEDIA?: R2Bucket;
  DOMAIN_REDIRECT?: string;
}

export * from '../../shared/types.js';
