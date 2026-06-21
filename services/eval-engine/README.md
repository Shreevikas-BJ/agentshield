# AgentShield Eval Engine

Optional deterministic Python analytics for offline audits and CI jobs. The Next.js app remains fully functional without this module and uses equivalent TypeScript fallbacks at runtime.

```bash
cd services/eval-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
python -m eval_engine.cli sample-run.json
```

The CLI accepts a run JSON document with `results`, `policyRules`, and optional `humanReviews`, then emits reliability, OWASP aggregation, policy coverage, review agreement, regression status, and report statistics.
