# MyBench Skill

A personal AI benchmark that tests whether your AI actually matches your preferences — then tells you how to fix it. Most of us have genuinely personal, inarticulate preferences for how AI should behave. But sometimes we can't configure or test these things - we just know when it feels wrong. Typically, I've found I need to compensate with manual workarounds - copy-paste into another tool, rewrite the output, switch models out of frustration. That friction is real and daily. This repo is a fun experiment to be able to easily create your own benchmark to see how the latest AI models and systems perform on tasks that matter to you, outside of what might be represented in standard benchmarks.


## What it does

1. Takes your preference in plain English ("warm emails", "concise code explanations")
2. Auto-generates 10 discriminating test prompts
3. Runs them against default vs your custom system prompt
4. Scores each pair with an impartial AI judge
5. Analyzes where your config lost and why
6. Suggests an improved system prompt automatically

## Commands

```
benchmark <your preference>
mybench <your preference>
mybench <your preference> with prompt "<your system prompt>"
```

## Examples

```
benchmark warm and friendly email replies
mybench concise technical explanations for non-engineers
mybench patient and encouraging coding help with prompt "You are a patient coding mentor who celebrates small wins"
```

## Environment variables (TBD)

- `ANTHROPIC_API_KEY` — required, your Anthropic API key

## Notes

- Runs ~10 test cases, expect 30-40 API calls total
- Takes ~30-60 seconds depending on rate limits
- Self-improvement suggestion is included automatically when Config B loses cases
