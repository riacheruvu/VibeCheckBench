# /alignharness - Export or run an AlignHarness preference suite

## Modes

### Promptfoo export (preferred)

```text
/alignharness export --profile examples/public-agent-profile.yaml --case-file examples/public-agent-cases.json --prompt-file examples/public-agent-system-prompt.txt --provider openai:chat:gpt-4.1-mini --out promptfooconfig.yaml
```

Run:

```bash
node skills/alignharness/scripts/export-promptfoo.mjs --profile "$PROFILE" --case-file "$CASE_FILE" --prompt-file "$PROMPT_FILE" --provider "$PROVIDER" --out "$OUT"
```

Then suggest:

```bash
npx promptfoo@latest eval -c "$OUT"
```

Report the generated config path, provider id, number of tests, and remind the user that JavaScript scoring is deterministic but model outputs depend on provider settings.

### Legacy single intent

```text
/alignharness "warm and friendly email replies"
/alignharness "concise technical explanations" --cases 5
/alignharness "patient coding help" --prompt "You are a patient mentor."
```

Run:

```bash
node skills/alignharness/scripts/run-alignharness.mjs --intent "$INTENT" $FLAGS
```

Report the score breakdown, win rate excluding ties, verdict, weakness analysis, and improved prompt suggestion when available.

### Legacy full profile

```text
/alignharness profile
/alignharness profile --prompt-file my-system-prompt.txt
/alignharness profile --cases 3
/alignharness profile --cases 3 --repeat 3 --judge-provider openai --judge-model gpt-4.1-mini --save-report
/alignharness profile --cases 3 --improve
```

First validate the profile on early or changed runs:

```bash
node skills/alignharness/scripts/run-profile.mjs --validate-profile
```

If provider setup is uncertain, run:

```bash
node skills/alignharness/scripts/run-profile.mjs --smoke-test
```

Then run:

```bash
node skills/alignharness/scripts/run-profile.mjs --profile preferences.yaml $FLAGS
```

Report aggregate weighted win rate, per-preference win rate, rubric score A vs B, loss reasons, strongest/weakest preference, repeat mean/stdev when present, and saved report path when present. Explain that this path depends on a judge model.

### Validate

```text
/alignharness validate
```

Run:

```bash
node skills/alignharness/scripts/run-profile.mjs --validate-profile
```

Report the profile name, preference count, preference ids, and any parser/schema issue.

### Smoke

```text
/alignharness smoke
```

Run:

```bash
node skills/alignharness/scripts/run-profile.mjs --smoke-test
```

Report which provider/model and judge provider/model were checked.

### Compare models

```text
/alignharness compare --models gpt-5.5,gpt-5.4,gpt-5.4-mini --cases 3 --repeat 3 --judge-provider openai --judge-model gpt-5.5
```

Run:

```bash
node skills/alignharness/scripts/compare-models.mjs --models "$MODELS" $FLAGS
```

Report candidate rubric score first, then A/B aggregate win rate. Explain that rubric score is the main model-version metric because the original A/B win rate was designed for prompt comparisons.

## Flags

| Flag | Description |
|---|---|
| `--cases N` | Test cases per preference, 1-20 |
| `--prompt "..."` | Custom system prompt to test as Config B |
| `--prompt-file path` | Load custom prompt from file |
| `--profile path` | Path to preferences YAML, default `preferences.yaml` |
| `--case-file path` | JSON case bank keyed by preference id/type |
| `--json` | Raw JSON output |
| `--model name` | Model override |
| `--provider name` | Provider override: `llamacpp`, `openai`, or `anthropic` |
| `--judge-provider name` | Separate judge provider for profile runs |
| `--judge-model name` | Separate judge model for profile runs |
| `--repeat N` | Repeat profile runs and report mean/stdev |
| `--save-report` | Save JSON report under `reports/` |
| `--report-dir path` | Custom report output directory |
| `--validate-profile` | Parse `preferences.yaml` without model calls |
| `--smoke-test` | Check provider/judge connectivity before a run |
| `--improve` | Analyze profile losses and generate an improved system prompt |
| `--models a,b,c` | Candidate models for `compare-models.mjs` |
| `--out path` | Promptfoo config output path for `export-promptfoo.mjs` |
| `--threshold N` | JavaScript assertion pass threshold for Promptfoo export |

## Provider notes

- `ALIGNHARNESS_PROVIDER=llamacpp`: use `ALIGNHARNESS_LLAMACPP_URL`, default `localhost:8080`, and optional `ALIGNHARNESS_LLAMACPP_API_KEY`.
- `OPENAI_API_KEY`: enables native OpenAI.
- `ANTHROPIC_API_KEY`: enables native Anthropic.
- Prefer Promptfoo export for local/offline regression and CI.
- For legacy A/B profile runs, prefer a separate judge through `ALIGNHARNESS_JUDGE_PROVIDER` / `ALIGNHARNESS_JUDGE_MODEL` or the matching flags.

## Follow-up behavior

- Default to Promptfoo export unless the user asks for A/B comparison, judge scoring, or prompt improvement.
- If Config B loses or ties in the legacy runner, offer to revise the tested prompt.
- If one preference is clearly weakest, target the next prompt iteration there.
- If the run is tiny or high variance, suggest `--repeat 3` before drawing strong conclusions.
- When `--improve` is used, show the weakness analysis and improved prompt, then suggest rerunning the profile against the improved prompt.
- When `--case-file` is provided, explain that the run used seeded user-research cases rather than generated cases.
