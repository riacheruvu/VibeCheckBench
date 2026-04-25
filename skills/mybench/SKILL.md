---
name: mybench
description: Benchmark whether an AI setup matches a user preference by generating test prompts, comparing a default response against a custom prompt, and proposing an improved system prompt when the custom setup loses.
metadata: {"openclaw":{"requires":{"bins":["node","python3"]}}}
---

# MyBench

Use this skill when the user wants to test whether an AI actually behaves the way they prefer, or wants to compare a default assistant against a custom system prompt.

## Workflow

1. Confirm the benchmark intent in a short phrase such as `warm and friendly email replies` or `concise technical explanations for non-engineers`.
2. Run the benchmark:

   ```bash
   node "{baseDir}/scripts/run-mybench.mjs" --intent "<user intent>"
   ```

3. If the user supplied a custom system prompt, pass it with `--prompt` for short prompts or `--prompt-file` for multiline prompts.
4. Summarize the result with the score breakdown, verdict, main failure modes, and improved prompt if one was generated.

## Commands

Short custom prompt:

```bash
node "{baseDir}/scripts/run-mybench.mjs" --intent "friendly support replies" --prompt "You are warm, brief, and practical."
```

Prompt from file:

```bash
node "{baseDir}/scripts/run-mybench.mjs" --intent "patient coding help" --prompt-file "/path/to/prompt.txt"
```

JSON output:

```bash
node "{baseDir}/scripts/run-mybench.mjs" --intent "warm emails" --json
```

## Guardrails

- Prefer the local model path when `MYBENCH_PROVIDER=local` is configured.
- If not using the local model path and neither `OPENAI_API_KEY` nor `ANTHROPIC_API_KEY` is present, stop and explain what is needed.
- Keep the benchmark size modest unless the user explicitly asks for more cases.
- Prefer `--prompt-file` when the custom prompt contains quotes or multiple paragraphs.
