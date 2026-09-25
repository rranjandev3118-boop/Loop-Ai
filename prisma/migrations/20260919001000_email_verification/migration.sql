CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailVerification_email_createdAt_idx" ON "EmailVerification"("email", "createdAt");
CREATE INDEX "EmailVerification_expiresAt_idx" ON "EmailVerification"("expiresAt");
