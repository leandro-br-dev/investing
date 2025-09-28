-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "market" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "historical_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    CONSTRAINT "historical_prices_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "assets" ("ticker") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Carteira Principal',
    CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "portfolio_items_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "portfolio_items_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "assets" ("ticker") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "currentDate" TEXT NOT NULL,
    "initialCashBRL" REAL NOT NULL DEFAULT 0,
    "initialCashUSD" REAL NOT NULL DEFAULT 0,
    "monthlyDepositBRL" REAL NOT NULL DEFAULT 0,
    "monthlyDepositUSD" REAL NOT NULL DEFAULT 0,
    "currentCashBRL" REAL NOT NULL DEFAULT 0,
    "currentCashUSD" REAL NOT NULL DEFAULT 0,
    "realizedProfitBRL" REAL NOT NULL DEFAULT 0,
    "realizedProfitUSD" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "simulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "simulation_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "simulationId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "simulation_items_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "simulation_items_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "assets" ("ticker") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "buyPeriodMonths" INTEGER NOT NULL DEFAULT 12,
    "sellPeriodMonths" INTEGER NOT NULL DEFAULT 24,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE INDEX "historical_prices_ticker_idx" ON "historical_prices"("ticker");

-- CreateIndex
CREATE INDEX "historical_prices_ticker_date_idx" ON "historical_prices"("ticker", "date");

-- CreateIndex
CREATE UNIQUE INDEX "historical_prices_ticker_date_key" ON "historical_prices"("ticker", "date");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_portfolioId_ticker_key" ON "portfolio_items"("portfolioId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_items_simulationId_ticker_key" ON "simulation_items"("simulationId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");
