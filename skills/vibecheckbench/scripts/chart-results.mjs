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
  --out <path>     Markdown or HTML output path
  --stdout         Print output instead of writing a file`);
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

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function percent(score) {
  return `${Math.round(score * 100)}%`;
}

function toneClass(score) {
  if (score >= 0.85) return "strong";
  if (score >= 0.65) return "solid";
  if (score >= 0.5) return "fragile";
  return "weak";
}

function renderHtml(summary) {
  const providers = [...summary.keys()].sort();
  const metrics = [...new Set(providers.flatMap(provider => [...summary.get(provider).keys()]))].sort();
  const overall = providers.map(provider => {
    const all = [...summary.get(provider).values()].flat();
    const passRate = average(all, item => item.pass ? 1 : 0);
    const mean = average(all, item => item.score);
    return { provider, passRate, mean };
  }).sort((a, b) => b.mean - a.mean);

  const overallRows = overall.map(item => `
        <tr>
          <td>${htmlEscape(item.provider)}</td>
          <td>${percent(item.passRate)}</td>
          <td>${item.mean.toFixed(2)}</td>
          <td>
            <div class="bar" aria-label="${htmlEscape(item.provider)} mean score ${item.mean.toFixed(2)}">
              <span class="${toneClass(item.mean)}" style="width:${percent(item.mean)}"></span>
            </div>
            <span class="read ${toneClass(item.mean)}">${labelFor(item.mean)}</span>
          </td>
        </tr>`).join("");

  const metricRows = metrics.map(metric => {
    const cells = providers.map(provider => {
      const items = summary.get(provider).get(metric) || [];
      if (!items.length) return `<td class="empty">n/a</td>`;
      const mean = average(items, item => item.score);
      const passRate = average(items, item => item.pass ? 1 : 0);
      return `<td class="cell ${toneClass(mean)}"><b>${mean.toFixed(2)}</b><span>${percent(passRate)} pass</span></td>`;
    }).join("");
    return `<tr><th scope="row">${htmlEscape(metric)}</th>${cells}</tr>`;
  }).join("");

  const providerHeaders = providers.map(provider => `<th scope="col">${htmlEscape(provider)}</th>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VibeCheckBench Skill Chart</title>
  <style>
    :root {
      --ink: #17202a;
      --muted: #5c6672;
      --line: #d8dde4;
      --panel: #f6f8fa;
      --strong: #1f7a4d;
      --solid: #2f6db5;
      --fragile: #a26000;
      --weak: #b3261e;
      --bg: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 32px auto 48px;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      line-height: 1.1;
      margin: 0 0 8px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      margin: 28px 0 12px;
      letter-spacing: 0;
    }
    p { color: var(--muted); max-width: 780px; margin: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      table-layout: fixed;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
      text-align: left;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    th { background: var(--panel); font-weight: 650; }
    tr:last-child td, tr:last-child th { border-bottom: 0; }
    .bar {
      display: inline-block;
      width: min(220px, 70%);
      height: 10px;
      background: #e8ecf1;
      border-radius: 999px;
      overflow: hidden;
      margin-right: 10px;
      vertical-align: middle;
    }
    .bar span { display: block; height: 100%; }
    .strong { background-color: #e7f4ec; color: var(--strong); }
    .solid { background-color: #e7f0fb; color: var(--solid); }
    .fragile { background-color: #fff3df; color: var(--fragile); }
    .weak { background-color: #fdebea; color: var(--weak); }
    .bar .strong { background: var(--strong); }
    .bar .solid { background: var(--solid); }
    .bar .fragile { background: var(--fragile); }
    .bar .weak { background: var(--weak); }
    .read {
      display: inline-block;
      min-width: 72px;
      border-radius: 4px;
      padding: 2px 6px;
      font-weight: 650;
      text-align: center;
    }
    .matrix th:first-child { width: 280px; }
    .cell b { display: block; font-size: 16px; }
    .cell span { color: var(--muted); font-size: 12px; }
    .empty { color: var(--muted); background: #fafbfc; }
    ul { color: var(--muted); padding-left: 20px; }
    @media (max-width: 720px) {
      main { width: min(100vw - 20px, 1120px); margin-top: 20px; }
      table { font-size: 12px; }
      th, td { padding: 8px; }
      .matrix th:first-child { width: 180px; }
      .bar { width: 100%; margin: 0 0 6px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>VibeCheckBench Skill Chart</h1>
      <p>This is a personal-fit chart, not a general model leaderboard. Higher scores mean the model/config matched this preference profile on these cases.</p>
    </header>

    <section>
      <h2>Overall</h2>
      <table>
        <thead>
          <tr><th>Model/config</th><th>Pass rate</th><th>Mean score</th><th>Read</th></tr>
        </thead>
        <tbody>${overallRows}
        </tbody>
      </table>
    </section>

    <section>
      <h2>By Preference</h2>
      <table class="matrix">
        <thead>
          <tr><th>Preference</th>${providerHeaders}</tr>
        </thead>
        <tbody>${metricRows}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Notes</h2>
      <ul>
        <li>Review failing outputs manually before drawing conclusions.</li>
        <li>Re-run with held-out cases before treating a config as improved.</li>
        <li>Keep private profiles local unless the provider's data policy is acceptable for that content.</li>
      </ul>
    </section>
  </main>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = readRows(path.resolve(process.cwd(), args.input));
  if (!rows.length) throw new Error(`No Promptfoo result rows found in ${args.input}.`);
  const outPath = path.resolve(process.cwd(), args.out);
  const summary = summarize(rows);
  const output = outPath.endsWith(".html") ? renderHtml(summary) : render(summary);

  if (args.stdout) {
    process.stdout.write(output);
    return;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`Wrote skill chart: ${outPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Skill chart error: ${error.message}`);
  process.exit(1);
}
