# /vibecheckbench - Export, run, or chart a preference-fit eval

## Default: Promptfoo Export + Skill Chart

Use this path unless the user explicitly asks for A/B judge scoring.

Run local `node` export/chart commands yourself. Do not merely tell the user to run them.

Default complex comparison:

```text
/vibecheckbench export --example complex --provider openai:chat:gpt-4.1-mini --provider ollama:chat:qwen3:8b --out promptfooconfig.models.yaml
```

If the user says "these two configs" but does not provide two config files, prompts, provider ids, or paths, ask for them. If they ask for a demo or example comparison, use `--example complex` with bundled demo results instead of blocking.

Run:

```bash
node skills/vibecheckbench/scripts/export-promptfoo.mjs --example complex --provider "$PROVIDER_A" --provider "$PROVIDER_B" --out "$OUT"
```

For an offline demo, generate the checked-in example chart:

```bash
node skills/vibecheckbench/scripts/chart-results.mjs --input examples/promptfoo-results.models.example.json --out reports/skill-chart.html
```

Tell the user this chart is demo data: its model/config labels come from `examples/promptfoo-results.models.example.json`, not from the newly exported providers. After a real Promptfoo run, chart `reports/results.json` instead.

## Real Model Comparisons

If the user asks for a real model comparison, check whether Promptfoo is already available before running or installing anything:

```bash
promptfoo --version
npx --no-install promptfoo --version
```

If Promptfoo is available and the providers are local/offline, run:

```bash
promptfoo eval -c "$OUT" --output reports/results.json
node skills/vibecheckbench/scripts/chart-results.mjs --input reports/results.json --out reports/skill-chart.html
```

If Promptfoo is not available, or if running it would download packages or call hosted providers, ask the user for explicit approval before using `npx promptfoo@latest` or any provider API. Explain that:

- `npx promptfoo@latest` may download code
- hosted providers may receive prompts and outputs
- private or sensitive profiles should stay local unless the provider policy is acceptable

Report generated artifact paths, provider ids, test count, and whether the chart is demo data or real model results.

## Validate

```bash
node --check skills/vibecheckbench/scripts/export-promptfoo.mjs
node --check skills/vibecheckbench/scripts/chart-results.mjs
node skills/vibecheckbench/scripts/export-promptfoo.mjs --example complex --provider echo --out promptfooconfig.yaml
node skills/vibecheckbench/scripts/chart-results.mjs --input examples/promptfoo-results.models.example.json --stdout
```

Echo is a plumbing check only. Echoed prompts should fail the generated rubrics because non-answers are guarded against.

Use `--stdout` when validating without writing files.

## Optional Legacy A/B

Use only when requested:

```bash
node skills/vibecheckbench/scripts/run-profile.mjs --profile preferences.yaml --prompt-file prompt.txt --cases 3 --repeat 3 --save-report
```

For serious A/B runs, prefer:

```bash
--judge-provider openai --judge-model gpt-4.1-mini
```

## Flags

| Flag | Description |
|---|---|
| `--example public|complex` | Bundled example suite |
| `--profile path` | Preference YAML |
| `--case-file path` | JSON case bank keyed by preference id/type |
| `--prompt-file path` | System prompt/config to test |
| `--provider id` | Promptfoo provider id; repeat for comparisons |
| `--out path` | Promptfoo config or chart output path |
| `--stdout` | Print generated config/chart instead of writing it |
| `--threshold N` | JavaScript assertion pass threshold |
| `--cases N` | Legacy runner cases per preference |
| `--repeat N` | Legacy runner repeat count |
| `--judge-provider name` | Legacy separate judge provider |
| `--judge-model name` | Legacy separate judge model |

## Behavior

- Default to Promptfoo export plus chart generation.
- For demo requests, create the config and chart artifacts in the current workspace when possible.
- Keep privacy explicit when using hosted providers.
- Treat deterministic rubrics as regression checks, not proof of model quality.
- Avoid presenting tiny runs as conclusive.
