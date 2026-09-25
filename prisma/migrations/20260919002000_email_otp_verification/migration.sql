ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);

CREATE TYPE "EmailOtpPurpose" AS ENUM ('SIGNUP', 'LOGIN');

CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" "EmailOtpPurpose" NOT NULL,
    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtp_email_purpose_createdAt_idx" ON "EmailOtp"("email", "purpose", "createdAt");
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

DROP TABLE IF EXISTS "EmailVerification";

UPDATE "User"
SET "emailVerified" = CURRENT_TIMESTAMP
WHERE "email" IN ('admin@loop.demo', 'analyst@loop.demo', 'viewer@loop.demo');
