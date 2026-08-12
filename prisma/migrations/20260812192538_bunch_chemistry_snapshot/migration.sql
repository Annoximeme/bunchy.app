-- CreateTable
CREATE TABLE "BunchChemistry" (
    "bunchId" TEXT NOT NULL,
    "score" INTEGER,
    "previousScore" INTEGER,
    "confidence" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "observations" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BunchChemistry_pkey" PRIMARY KEY ("bunchId")
);

-- CreateIndex
CREATE INDEX "BunchChemistry_computedAt_idx" ON "BunchChemistry"("computedAt");

-- AddForeignKey
ALTER TABLE "BunchChemistry" ADD CONSTRAINT "BunchChemistry_bunchId_fkey" FOREIGN KEY ("bunchId") REFERENCES "Bunch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
