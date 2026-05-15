-- Remove plaintext accessToken from Store; OAuth tokens remain in Session table only.
ALTER TABLE "Store" DROP COLUMN IF EXISTS "accessToken";
