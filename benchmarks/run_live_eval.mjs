import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeAlveResponse } from '../lib/alve_rubric.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarkPath = path.join(__dirname, 'alve_benchmark.json');
const TARGET_URL = process.env.TARGET_URL || 'https://mathsolverbot.vercel.app/api/solve';
const LIMIT = Number(process.env.EVAL_LIMIT || '15');

async function solveProblem(prompt) {
  const start = performance.now();
  const res = await fetch(TARGET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem: prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const raw = await res.text();
  const elapsedMs = Math.round(performance.now() - start);
  let text = '';
  let model = 'unknown';

  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
    try {
      const parsed = JSON.parse(line.slice(6));
      if (parsed.model) model = parsed.model;
      const delta = parsed.choices?.[0]?.delta?.content || '';
      text += delta;
    } catch {
      // ignore partial lines
    }
  }

  return { text, model, elapsedMs };
}

async function main() {
  const items = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8')).slice(0, LIMIT);
  const results = [];

  for (const item of items) {
    try {
      const { text, model, elapsedMs } = await solveProblem(item.prompt);
      const grade = gradeAlveResponse(text, { expectUnsolvable: item.expectUnsolvable });
      results.push({
        id: item.id,
        category: item.category,
        model,
        elapsedMs,
        passed: grade.passed,
        score: grade.score,
        finalAnswer: grade.finalAnswer,
        errors: grade.errors,
      });
      console.error(`[${item.id}] passed=${grade.passed} score=${grade.score} time=${elapsedMs}ms model=${model}`);
    } catch (err) {
      results.push({
        id: item.id,
        category: item.category,
        model: 'error',
        elapsedMs: 0,
        passed: false,
        score: 0,
        finalAnswer: null,
        errors: [err.message],
      });
      console.error(`[${item.id}] ERROR: ${err.message}`);
    }
    // Polite pacing to respect free OpenRouter rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  const passedCount = results.filter((r) => r.passed).length;
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const validTimes = results.filter((r) => r.elapsedMs > 0).map((r) => r.elapsedMs);
  const avgMs = validTimes.length ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 0;

  const summary = {
    targetUrl: TARGET_URL,
    total: results.length,
    passed: passedCount,
    passRate: `${Math.round((passedCount / results.length) * 100)}%`,
    avgRubricScore: avgScore,
    avgLatencyMs: avgMs,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
