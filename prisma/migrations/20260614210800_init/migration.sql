-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TestCaseType" AS ENUM ('normal', 'edge_case', 'adversarial', 'tool_safety', 'privacy', 'policy');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('pass', 'fail', 'needs_review');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FailureCategory" AS ENUM ('policy_violation', 'unsafe_tool_call', 'hallucination', 'privacy_leak', 'missing_escalation', 'poor_reasoning', 'incomplete_answer', 'none');

-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('groq', 'gemini', 'openai', 'mock');

-- CreateEnum
CREATE TYPE "LaunchReadiness" AS ENUM ('not_ready', 'needs_review', 'ready');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerEmail" TEXT NOT NULL DEFAULT 'demo@agentshield.dev',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "toolsText" TEXT NOT NULL,
    "policyText" TEXT NOT NULL,
    "sampleTasksText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "toolsText" TEXT NOT NULL,
    "policyText" TEXT NOT NULL,
    "sampleTasksText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "testSuiteId" TEXT NOT NULL,
    "type" "TestCaseType" NOT NULL,
    "userInput" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "testSuiteId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'pending',
    "reliabilityScore" DOUBLE PRECISION,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "failedTests" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "actualOutput" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "severity" "Severity" NOT NULL,
    "failureCategory" "FailureCategory" NOT NULL DEFAULT 'none',
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Failure" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testResultId" TEXT NOT NULL,
    "category" "FailureCategory" NOT NULL,
    "severity" "Severity" NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Failure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCall" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT,
    "provider" "ModelProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "launchReadiness" "LaunchReadiness" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Agent_ownerEmail_idx" ON "Agent"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_agentId_versionNumber_key" ON "PromptVersion"("agentId", "versionNumber");

-- CreateIndex
CREATE INDEX "TestSuite_agentId_createdAt_idx" ON "TestSuite"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "TestCase_testSuiteId_type_idx" ON "TestCase"("testSuiteId", "type");

-- CreateIndex
CREATE INDEX "TestRun_agentId_startedAt_idx" ON "TestRun"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "TestRun_testSuiteId_idx" ON "TestRun"("testSuiteId");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_verdict_idx" ON "TestResult"("testRunId", "verdict");

-- CreateIndex
CREATE INDEX "TestResult_failureCategory_idx" ON "TestResult"("failureCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Failure_testResultId_key" ON "Failure"("testResultId");

-- CreateIndex
CREATE INDEX "Failure_testRunId_severity_idx" ON "Failure"("testRunId", "severity");

-- CreateIndex
CREATE INDEX "Failure_category_idx" ON "Failure"("category");

-- CreateIndex
CREATE INDEX "ModelCall_testRunId_provider_idx" ON "ModelCall"("testRunId", "provider");

-- CreateIndex
CREATE INDEX "ModelCall_provider_createdAt_idx" ON "ModelCall"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_testRunId_key" ON "Report"("testRunId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Failure" ADD CONSTRAINT "Failure_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Failure" ADD CONSTRAINT "Failure_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCall" ADD CONSTRAINT "ModelCall_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

