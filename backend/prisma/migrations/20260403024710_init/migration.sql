-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" TEXT,
    "fcraConsentAt" TIMESTAMP(3),
    "consentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pulledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equifaxFico4" INTEGER,
    "equifaxVantage4" INTEGER,
    "transunionFico4" INTEGER,
    "transunionVantage4" INTEGER,
    "experianFico8" INTEGER,
    "experianVantage4" INTEGER,
    "negativeMarkCount" INTEGER NOT NULL,
    "inquiryCount" INTEGER NOT NULL,
    "collectionCount" INTEGER NOT NULL,
    "publicRecordCount" INTEGER NOT NULL,
    "bureauStatuses" JSONB NOT NULL,

    CONSTRAINT "PullSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bureau" TEXT NOT NULL,
    "disputePath" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "letterType" TEXT NOT NULL,
    "letterNumber" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "bureau" TEXT,
    "creditor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditorName" TEXT NOT NULL,
    "accountDescription" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "lettersSent" JSONB NOT NULL DEFAULT '[]',
    "agreedTerms" TEXT,
    "paymentStatus" TEXT,
    "deletionVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PullSnapshot_userId_pulledAt_idx" ON "PullSnapshot"("userId", "pulledAt");

-- CreateIndex
CREATE INDEX "Dispute_userId_status_idx" ON "Dispute"("userId", "status");

-- CreateIndex
CREATE INDEX "Negotiation_userId_phase_idx" ON "Negotiation"("userId", "phase");

-- AddForeignKey
ALTER TABLE "PullSnapshot" ADD CONSTRAINT "PullSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
