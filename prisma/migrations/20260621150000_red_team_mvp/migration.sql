ALTER TYPE "FailureCategory" ADD VALUE IF NOT EXISTS 'prompt_injection';
ALTER TYPE "FailureCategory" ADD VALUE IF NOT EXISTS 'excessive_agency';

CREATE TYPE "SimulatedAgentMode" AS ENUM ('safe', 'leaky', 'overhelpful', 'tool_happy', 'hallucinating', 'prompt_injection_vulnerable');
CREATE TYPE "ScanLevel" AS ENUM ('basic', 'strict', 'aggressive');
CREATE TYPE "HumanReviewDecision" AS ENUM ('agree', 'disagree', 'needs_further_review');

ALTER TABLE "Agent"
  ADD COLUMN "simulationMode" "SimulatedAgentMode" NOT NULL DEFAULT 'safe',
  ADD COLUMN "scanLevel" "ScanLevel" NOT NULL DEFAULT 'strict';

ALTER TABLE "TestSuite"
  ADD COLUMN "promptVersionId" TEXT,
  ADD COLUMN "scanLevel" "ScanLevel" NOT NULL DEFAULT 'strict',
  ADD COLUMN "simulatedMode" "SimulatedAgentMode" NOT NULL DEFAULT 'safe',
  ADD COLUMN "policyCoverageScore" DOUBLE PRECISION,
  ADD COLUMN "policyCoverage" JSONB;

ALTER TABLE "TestCase"
  ADD COLUMN "attackCategory" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'groq',
  ADD COLUMN "regressionTestId" TEXT;

ALTER TABLE "TestRun"
  ADD COLUMN "promptVersionId" TEXT,
  ADD COLUMN "simulatedMode" "SimulatedAgentMode" NOT NULL DEFAULT 'safe',
  ADD COLUMN "scanLevel" "ScanLevel" NOT NULL DEFAULT 'strict',
  ADD COLUMN "policyCoverageScore" DOUBLE PRECISION,
  ADD COLUMN "needsReviewTests" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedTests" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "currentTestLabel" TEXT,
  ADD COLUMN "currentAttackCategory" TEXT,
  ADD COLUMN "phase" TEXT NOT NULL DEFAULT 'queued',
  ADD COLUMN "evaluatorStatus" TEXT NOT NULL DEFAULT 'waiting';

ALTER TABLE "TestResult"
  ADD COLUMN "owaspRisk" TEXT NOT NULL DEFAULT 'LLM09: Overreliance',
  ADD COLUMN "evidence" TEXT,
  ADD COLUMN "recommendedFix" TEXT,
  ADD COLUMN "confidenceScore" DOUBLE PRECISION,
  ADD COLUMN "evaluatorProvider" "ModelProvider" NOT NULL DEFAULT 'mock',
  ADD COLUMN "usedFallback" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Failure"
  ADD COLUMN "owaspRisk" TEXT NOT NULL DEFAULT 'LLM09: Overreliance';

ALTER TABLE "Report"
  ADD COLUMN "details" JSONB;

CREATE TABLE "HumanReview" (
  "id" TEXT NOT NULL,
  "testResultId" TEXT NOT NULL,
  "decision" "HumanReviewDecision" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HumanReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegressionTest" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "sourceTestResultId" TEXT,
  "type" "TestCaseType" NOT NULL,
  "attackCategory" TEXT,
  "userInput" TEXT NOT NULL,
  "expectedBehavior" TEXT NOT NULL,
  "riskLevel" "RiskLevel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegressionTest_pkey" PRIMARY KEY ("id")
);

UPDATE "TestSuite" suite
SET "promptVersionId" = (
  SELECT version."id"
  FROM "PromptVersion" version
  WHERE version."agentId" = suite."agentId"
  ORDER BY version."versionNumber" DESC
  LIMIT 1
);

UPDATE "TestRun" run
SET
  "promptVersionId" = (
    SELECT version."id"
    FROM "PromptVersion" version
    WHERE version."agentId" = run."agentId"
    ORDER BY version."versionNumber" DESC
    LIMIT 1
  ),
  "completedTests" = CASE WHEN run."status" = 'completed' THEN run."totalTests" ELSE 0 END,
  "needsReviewTests" = (
    SELECT COUNT(*)::INTEGER FROM "TestResult" result
    WHERE result."testRunId" = run."id" AND result."verdict" = 'needs_review'
  ),
  "phase" = CASE WHEN run."status" = 'completed' THEN 'completed' WHEN run."status" = 'failed' THEN 'failed' ELSE 'queued' END,
  "evaluatorStatus" = CASE WHEN run."status" = 'completed' THEN 'completed' WHEN run."status" = 'failed' THEN 'failed' ELSE 'waiting' END;

UPDATE "TestCase"
SET "attackCategory" = CASE
  WHEN "type" = 'adversarial' THEN 'prompt_injection'
  WHEN "type" = 'tool_safety' THEN 'unauthorized_tool_use'
  WHEN "type" = 'privacy' THEN 'privacy_leak'
  WHEN "type" = 'policy' THEN 'policy_bypass'
  WHEN "type" = 'edge_case' THEN 'missing_escalation'
  ELSE 'normal'
END;

UPDATE "TestResult"
SET "owaspRisk" = CASE
  WHEN "failureCategory" = 'privacy_leak' THEN 'LLM02: Sensitive Information Disclosure'
  WHEN "failureCategory" = 'unsafe_tool_call' THEN 'LLM07: Insecure Plugin / Tool Design'
  WHEN "failureCategory" = 'missing_escalation' THEN 'LLM08: Excessive Agency'
  WHEN "failureCategory" = 'policy_violation' THEN 'LLM01: Prompt Injection'
  ELSE 'LLM09: Overreliance'
END;

UPDATE "Failure" failure
SET "owaspRisk" = result."owaspRisk"
FROM "TestResult" result
WHERE failure."testResultId" = result."id";

CREATE UNIQUE INDEX "HumanReview_testResultId_key" ON "HumanReview"("testResultId");
CREATE INDEX "HumanReview_decision_idx" ON "HumanReview"("decision");
CREATE UNIQUE INDEX "RegressionTest_sourceTestResultId_key" ON "RegressionTest"("sourceTestResultId");
CREATE INDEX "RegressionTest_agentId_createdAt_idx" ON "RegressionTest"("agentId", "createdAt");
CREATE INDEX "TestCase_regressionTestId_idx" ON "TestCase"("regressionTestId");
CREATE INDEX "TestCase_attackCategory_idx" ON "TestCase"("attackCategory");
CREATE INDEX "TestRun_promptVersionId_idx" ON "TestRun"("promptVersionId");

ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_promptVersionId_fkey"
  FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_promptVersionId_fkey"
  FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_testResultId_fkey"
  FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegressionTest" ADD CONSTRAINT "RegressionTest_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegressionTest" ADD CONSTRAINT "RegressionTest_sourceTestResultId_fkey"
  FOREIGN KEY ("sourceTestResultId") REFERENCES "TestResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_regressionTestId_fkey"
  FOREIGN KEY ("regressionTestId") REFERENCES "RegressionTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
