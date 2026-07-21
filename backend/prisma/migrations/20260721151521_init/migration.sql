-- CreateTable
CREATE TABLE "Viewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "joinTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "HostConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL DEFAULT 'Sreedev',
    "passwordHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PresentationState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activeFile" TEXT,
    "currentSlide" INTEGER NOT NULL DEFAULT 1,
    "totalSlides" INTEGER NOT NULL DEFAULT 0,
    "isStarted" BOOLEAN NOT NULL DEFAULT false,
    "isBlackScreen" BOOLEAN NOT NULL DEFAULT false,
    "presenterNotes" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Viewer_sessionId_key" ON "Viewer"("sessionId");
