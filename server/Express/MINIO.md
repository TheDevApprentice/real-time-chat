# MinIO – Object Storage Usage in the Server

This document explains how the Express server uses MinIO (S3-compatible) for file storage, which service wraps the S3 client, required environment variables, the upload/delete REST routes, URL shaping, and troubleshooting.

Paths are relative to `server/Express/`.

---

## Where MinIO/S3 Is Used

- `domain/services/storageServices/S3Service.ts`
  - Wrapper around AWS SDK v3 `@aws-sdk/client-s3` with a singleton (`S3Service.getInstance()`).
  - Implements:
    - `uploadBuffer(buffer, key, contentType)` → `{ key, url }`
    - `copyObject(srcKey, dstKey)`
    - `deleteObject(key)`
    - `publicUrl(key)` → builds a public URL for the object
  - Uses path-style addressing when `S3_USE_PATH_STYLE=true` (default for MinIO).

- `api/routes/REST/controllers/UploadRESTController.ts`
  - Authenticated endpoints for file upload and deletion.
  - Uses Multer in-memory storage for uploads.
  - Enforces MIME and extension whitelist (images/videos) and size limit (20 MB).
  - Rate-limited and brute-force protected via Redis middlewares.

---

## Environment Variables

Set these for the server process (see Docker Compose examples in repo root):

- `S3_ENDPOINT` (required)
  - Example: `http://minio:9000`
- `S3_REGION` (optional; default `us-east-1`)
- `S3_ACCESS_KEY` (required)
- `S3_SECRET_KEY` (required)
- `S3_BUCKET` (required)
- `S3_USE_PATH_STYLE` (optional; default `true`)
  - Should be `true` for MinIO in most setups
- `S3_PUBLIC_URL_BASE` (optional)
  - If set, returned URLs will be `S3_PUBLIC_URL_BASE/<key>`
  - If not set, URLs fall back to `S3_ENDPOINT/<bucket>/<key>` (works for MinIO with public bucket and path-style)

Example (from `docker-stack-devV4.swarm.yml`):
```
S3_ENDPOINT: http://minio:9000
S3_REGION: us-east-1
S3_ACCESS_KEY: admin
S3_SECRET_KEY: adminadmin123
S3_BUCKET: chat-bucket
S3_USE_PATH_STYLE: "true"
S3_PUBLIC_URL_BASE: http://localhost/minio/chat-bucket
```

---

## REST Endpoints (Uploads)

- Base router: `api/routes/REST/controllers/UploadRESTController.ts`

- `POST /api/upload`
  - Auth required
  - Body: `multipart/form-data` with `file` field
  - Query:
    - `temp=1|0` (default `1`): if `1`, store under `uploads/tmp/<roomId>/<userId>/...`
    - `roomId=<string>`: required when `temp=1`
  - Returns: `{ url, key, size, contentType }`
  - Rate limit and brute-force protections applied

- `DELETE /api/upload`
  - Auth required
  - Body (JSON): `{ "keys": ["uploads/tmp/...", ...] }`
  - Only allows deleting temp objects under `uploads/tmp/` owned by the requesting user
  - Returns: `{ deleted: string[] }`

---

## Key Structure and Lifecycle

- Temporary uploads (used during message composition):
  - `uploads/tmp/<roomId>/<userId>/<YYYY>/<MM>/<DD>/<random>.<ext>`
  - Cleaned explicitly by the client (DELETE route) when message is canceled
- Permanent uploads (after message is sent):
  - `uploads/<userId>/<YYYY>/<MM>/<DD>/<random>.<ext>`
  - Application keeps only the key; content links are built via `S3Service.publicUrl(key)`

---

## Public URLs

`S3Service.uploadBuffer()` returns `{ key, url }` where:

- If `S3_PUBLIC_URL_BASE` is set: `url = S3_PUBLIC_URL_BASE/<key>`
- Else: fallback: `url = S3_ENDPOINT/<bucket>/<key>` (path-style)

You can also call `S3Service.publicUrl(key)` to reconstruct a URL later.

---

## Security Notes

- Buckets should enforce suitable read policies:
  - Dev: public read may be acceptable
  - Prod: prefer presigned URLs or a proxy endpoint; avoid public buckets for sensitive data
- Validate content type and file extensions (already enforced in `UploadRESTController.ts`).
- Rate-limit and brute-force protections are enabled for upload endpoints.
- Consider antivirus scanning for untrusted uploads if exposed to the public internet.

---

## Troubleshooting

- Upload fails with 415 (Unsupported Media Type)
  - Check MIME/extension whitelist in `UploadRESTController.ts`.

- `Missing S3 configuration` error on boot
  - Ensure `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET` are set.

- Uploaded URL not reachable
  - If using Traefik path prefix (e.g., `/minio`), set `S3_PUBLIC_URL_BASE` to a routable URL, e.g. `http://localhost/minio/<bucket>`.
  - Verify Traefik route labels for MinIO and the bucket policy.

- Keys look correct but object not found
  - Confirm `S3_USE_PATH_STYLE=true` for MinIO.
  - Check the bucket actually contains the uploaded object and MinIO console shows it.

---

## Related Files

- Service: `domain/services/storageServices/S3Service.ts`
- Interface: `domain/interfaces/storageInterface/IS3Service.ts`
- REST controller: `api/routes/REST/controllers/UploadRESTController.ts`
- Gateway context (DI): `api/di/container.ts` (binds `s3Service`)
