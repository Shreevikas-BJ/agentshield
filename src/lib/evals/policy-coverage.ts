import type { TestCaseDraft } from "@/lib/validation/schemas";

export type PolicyCoverageRule = {
  rule: string;
  covered: boolean;
  testCount: number;
  matchedCategories: string[];
};

export type PolicyCoverageSummary = {
  score: number;
  coveredRules: number;
  totalRules: number;
  rules: PolicyCoverageRule[];
  warnings: string[];
};

const stopWords = new Set([
  "about", "after", "agent", "always", "before", "company", "from", "into", "must",
  "never", "only", "should", "their", "there", "these", "this", "with", "without",
]);

export function calculatePolicyCoverage(
  policyText: string,
  tests: Array<Pick<TestCaseDraft, "userInput" | "expectedBehavior" | "type" | "attackCategory">>,
): PolicyCoverageSummary {
  const policyRules = splitPolicyRules(policyText);
  const rules = policyRules.map((rule) => {
    const ruleTokens = tokenize(rule);
    const inferredCategories = inferPolicyCategories(rule);
    const matches = tests.filter((testCase) => {
      const testText = `${testCase.userInput} ${testCase.expectedBehavior}`.toLowerCase();
      const overlap = ruleTokens.filter((token) => testText.includes(token)).length;
      const category = testCase.attackCategory ?? testCase.type;
      return overlap >= Math.min(2, Math.max(1, ruleTokens.length)) || inferredCategories.includes(category);
    });

    return {
      rule,
      covered: matches.length > 0,
      testCount: matches.length,
      matchedCategories: Array.from(new Set(matches.map((item) => item.attackCategory ?? item.type))),
    };
  });
  const coveredRules = rules.filter((rule) => rule.covered).length;
  const score = rules.length === 0 ? 100 : Math.round((coveredRules / rules.length) * 100);

  return {
    score,
    coveredRules,
    totalRules: rules.length,
    rules,
    warnings: rules.filter((rule) => !rule.covered).map((rule) => `Missing test coverage: ${rule.rule}`),
  };
}

export function splitPolicyRules(policyText: string) {
  return policyText
    .split(/(?:\r?\n|[.;])+/)
    .map((rule) => rule.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((rule) => rule.length >= 8)
    .slice(0, 16);
}

function tokenize(text: string) {
  return Array.from(new Set(
    (text.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) ?? [])
      .filter((token) => !stopWords.has(token)),
  )).slice(0, 8);
}

function inferPolicyCategories(rule: string) {
  const normalized = rule.toLowerCase();
  const categories: string[] = [];
  if (/private|internal|personal|pii|sensitive|notes/.test(normalized)) categories.push("privacy_leak", "sensitive_data_extraction", "privacy");
  if (/tool|send|refund|delete|update|action|approval/.test(normalized)) categories.push("unauthorized_tool_use", "excessive_agency", "tool_safety");
  if (/escalat|manager|review|threshold/.test(normalized)) categories.push("missing_escalation", "fraud_escalation", "edge_case");
  if (/prompt|instruction|jailbreak|override/.test(normalized)) categories.push("prompt_injection", "jailbreak_attempt", "adversarial");
  if (/fact|invent|accurate|unsupported|policy/.test(normalized)) categories.push("hallucinated_policy", "policy_bypass", "policy");
  return categories;
}
