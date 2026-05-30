#!/usr/bin/env node
/**
 * Convert Promptfoo JSON/JSONL output into a compact VibeCheckBench skill chart.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function usage() {
  console.log(`VibeCheckBench skill chart

Usage:
  node skills/vibecheckbench/scripts/chart-results.mjs --input results.json --out reports/skill-chart.md

Options:
  --input <path>   Promptfoo JSON or JSONL output
  --out <path>     Markdown output path
  --stdout         Print markdown instead of writing a file`);
}

function parseArgs(argv) {
  const args = { input: "", out: "reports/skill-chart.md", stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") { args.input = argv[++i]; continue; }
    if (arg === "--out") { args.out = argv[++i]; continue; }
    if (arg === "--stdout") { args.stdout = true; continue; }
    if (arg === "--help" || arg === "-h") { usage(); process.exit(0); }
  }
  if (!args.input) throw new Error("--input is required.");
  return args;
}

function readRows(inputPath) {
  const text = fs.readFileSync(inputPath, "utf8").trim();
  if (!text) return [];

  if (inputPath.endsWith(".jsonl")) {
    return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }

  const payload = JSON.parse(text);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results?.outputs)) return payload.results.outputs;
  if (Array.isArray(payload.outputs)) return payload.outputs;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function providerOf(row) {
  const provider = row.provider || row.providerId || row.providerResponse?.provider;
  if (typeof provider === "string") return provider;
  if (provider?.id) return provider.id;
  if (provider?.label) return provider.label;
  return "unknown-provider";
}

function varsOf(row) {
  return row.vars || row.testCase?.vars || row.test?.vars || row.test?.options?.vars || {};
}

function metricOf(row) {
  const vars = varsOf(row);
  if (vars.preference_id) return vars.preference_id;

  const component = row.gradingResult?.componentResults?.find(result => result.assertion?.metric);
  if (component?.assertion?.metric) return component.assertion.metric;

  return row.metric || "unknown_skill";
}

function scoreOf(row) {
  const raw = row.score ?? row.gradingResult?.score ?? row.result?.score;
  const score = Number(raw);
  if (Number.isFinite(score)) return Math.max(0, Math.min(1, score));
  return passOf(row) ? 1 : 0;
}

function passOf(row) {
  if (typeof row.pass === "boolean") return row.pass;
  if (typeof row.success === "boolean") return row.success;
  if (typeof row.gradingResult?.pass === "boolean") return row.gradingResult.pass;
  return scoreOf(row) >= 0.5;
}

function labelFor(score) {
  if (score >= 0.85) return "strong";
  if (score >= 0.65) return "solid";
  if (score >= 0.5) return "fragile";
  return "needs work";
}

function bar(score) {
  const filled = Math.round(score * 10);
  return `${"#".repeat(filled)}${"-".repeat(10 - filled)}`;
}

function summarize(rows) {
  const byProvider = new Map();
  for (const row of rows) {
    const provider = providerOf(row);
    const metric = metricOf(row);
    if (!byProvider.has(provider)) byProvider.set(provider, new Map());
    const metrics = byProvider.get(provider);
    if (!metrics.has(metric)) metrics.set(metric, []);
    metrics.get(metric).push({ score: scoreOf(row), pass: passOf(row) });
  }
  return byProvider;
}

function average(items, selector) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + selector(item), 0) / items.length;
}

function render(summary) {
  const providers = [...summary.keys()].sort();
  const metrics = [...new Set(providers.flatMap(provider => [...summary.get(provider).keys()]))].sort();
  const lines = [
    "# VibeCheckBench Skill Chart",
    "",
    "This is a personal-fit chart, not a general model leaderboard. Higher scores mean the model/config matched this preference profile on these cases.",
    "",
    "## Overall",
    "",
    "| Model/config | Pass rate | Mean score | Read |",
    "|---|---:|---:|---|",
  ];

  for (const provider of providers) {
    const all = [...summary.get(provider).values()].flat();
    const passRate = average(all, item => item.pass ? 1 : 0);
    const mean = average(all, item => item.score);
    lines.push(`| ${provider} | ${(passRate * 100).toFixed(0)}% | ${mean.toFixed(2)} | ${bar(mean)} ${labelFor(mean)} |`);
  }

  lines.push("", "## By Preference", "");
  lines.push("| Preference | " + providers.join(" | ") + " |");
  lines.push("|---|" + providers.map(() => "---:").join("|") + "|");

  for (const metric of metrics) {
    const cells = providers.map(provider => {
      const items = summary.get(provider).get(metric) || [];
      if (!items.length) return "n/a";
      const mean = average(items, item => item.score);
      const passRate = average(items, item => item.pass ? 1 : 0);
      return `${mean.toFixed(2)} (${(passRate * 100).toFixed(0)}%)`;
    });
    lines.push(`| ${metric} | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Notes", "");
  lines.push("- Review failing outputs manually before drawing conclusions.");
  lines.push("- Re-run with held-out cases before treating a config as improved.");
  lines.push("- Keep private profiles local unless the provider's data policy is acceptable for that content.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = readRows(path.resolve(process.cwd(), args.input));
  if (!rows.length) throw new Error(`No Promptfoo result rows found in ${args.input}.`);
  const markdown = render(summarize(rows));

  if (args.stdout) {
    process.stdout.write(markdown);
    return;
  }

  const outPath = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, "utf8");
  console.log(`Wrote skill chart: ${outPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Skill chart error: ${error.message}`);
  process.exit(1);
}
