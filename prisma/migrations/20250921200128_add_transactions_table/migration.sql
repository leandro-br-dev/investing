-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "simulationId" TEXT,
    "ticker" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "price" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "assets" ("ticker") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_portfolioId_idx" ON "transactions"("portfolioId");

-- CreateIndex
CREATE INDEX "transactions_simulationId_idx" ON "transactions"("simulationId");

-- CreateIndex
CREATE INDEX "transactions_ticker_idx" ON "transactions"("ticker");

-- CreateIndex
CREATE INDEX "transactions_executedAt_idx" ON "transactions"("executedAt");
