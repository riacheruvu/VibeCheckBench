# /vibecheckbench - Run or review a personal-fit eval

## Friendly Default

Act like a setup guide, not a command manual. First clarify what the user wants:

- Draft tests from a plain-language preference
- Check whether local evaluation is ready
- Compare installed local models
- Export/run a Promptfoo comparison
- Review suggested setup changes

Run local commands yourself when safe. Do not merely tell the user to run them.
Ask before installing packages, downloading model weights, or sending prompts to
hosted providers.

## Local Readiness Check

Use this when the user says "use VibeCheckBench" or asks whether a model works:

```bash
node skills/vibecheckbench/scripts/check-promptfoo.mjs
```

Also check Ollama if local models are relevant:

```bash
ollama list
```

Explain the result plainly:

- "Ollama is running and I found these models..."
- "Promptfoo is not installed, but the built-in Ollama runner still works."
- "That model is not installed locally. I can pull it if you approve the download."

## Draft Tests From A Preference

If the user gives a sentence like "The user prefers concise, high-signal answers
that preserve necessary nuance," draft a starter test locally:

```bash
node skills/vibecheckbench/scripts/draft-test-case.mjs --preference "$PREFERENCE" --stdout
```

Present it as editable review material: preference area, public-safe prompt,
expected behavior, and whether it belongs in development or final-check cases.

## Dashboard Path

If the user wants a visual workflow:

```bash
npm run dashboard
```

Then open the local dashboard URL. The dashboard direct runner currently supports
Ollama. Other providers can be used through Promptfoo/export paths.

## Promptfoo Export + Skill Chart

Use this path when the user wants provider comparisons, CI-shaped evals, or a
Promptfoo report.

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
node skills/vibecheckbench/scripts/check-promptfoo.mjs
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

## Suggested Setup Changes

When reviewing dashboard recommendations, do not claim files were changed. Treat
instructions, memory, skills, tools, context, and routing as review surfaces.
Suggest concrete wording only as a candidate, for example:

- Prompt rule: "Lead with the answer. Keep responses concise by default, but include caveats that would change the user's decision."
- Memory note: "User prefers concise, high-signal answers that preserve necessary nuance."
- Skill guidance: "For explanation tasks, default to a short answer first. Add detail only when it changes the recommendation, risk, or next step."

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
