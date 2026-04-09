CREATE TABLE IF NOT EXISTS "StoredReport" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "report"    JSONB NOT NULL,
  "pulledAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoredReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoredReport_userId_key" ON "StoredReport"("userId");

ALTER TABLE "StoredReport"
  ADD CONSTRAINT "StoredReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
