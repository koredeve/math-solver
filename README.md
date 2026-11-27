# MathSolverBot — Deterministic Mathematical Logic Verification Engine

[![CI](https://github.com/koredeve/math-solver/actions/workflows/ci.yml/badge.svg)](https://github.com/koredeve/math-solver/actions/workflows/ci.yml)

**Live App:** [mathsolverbot.vercel.app](https://mathsolverbot.vercel.app)

## Architectural Overview
MathSolverBot addresses LLM token laziness, skipped algebraic steps, and hallucinations in discrete mathematics, calculus, and constraint satisfaction problems. It enforces the **Absolute Logic Verification Engine (ALVE)** 4-phase stateless state machine at `Temperature: 0.1`:
1. **Formalization**: Extraction of givens, goals, and governing axioms.
2. **Step-By-Step Derivation**: Atomic, axiomatically sourced forward chaining.
3. **Absolute Verification**: Boundary checks, domain assertions, and reverse verifications.
4. **Final Conclusion**: Direct `FINAL ANSWER` showcase paired with standardized display LaTeX.

## System Stack
- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript, **Marked.js**, and **KaTeX** (streaming SSE + client-side daily quota shield).
- **Backend**: Vercel Edge Function ([api/solve.js](api/solve.js)) with multi-model free OpenRouter fallback routing (text + vision chains).
- **Evaluation & Testing**: Zero-dependency `node:test` suite covering Edge API routing/failover ([tests/solve.test.mjs](tests/solve.test.mjs)), deterministic ALVE rubric grading ([lib/alve_rubric.mjs](lib/alve_rubric.mjs)), and a 15-item math/logic benchmark ([benchmarks/alve_benchmark.json](benchmarks/alve_benchmark.json)).

## Local Setup & Tests

```bash
git clone https://github.com/koredeve/math-solver.git
cd math-solver

# Run automated unit & rubric tests (Node 20+)
npm test

# Run live ALVE benchmark against deployed endpoint
EVAL_LIMIT=5 node benchmarks/run_live_eval.mjs

# Run locally with Vercel CLI
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxxx" > .env
vercel dev
```

## Live ALVE Benchmark Sample (Observed on `mathsolverbot.vercel.app`)
Running `EVAL_LIMIT=5 node benchmarks/run_live_eval.mjs` against the live free OpenRouter tier yielded **87/100 average rubric score** (**3/5 full 4-phase passes**; both non-passing items were `liquid/lfm-3-1.7b:free` skipping Phase 2):

| ID | Category | Routed Free Model | Latency | Rubric Score | Passed |
|---|---|---|---|---|---|
| `alg-01` | Algebra domain trap | `liquid/lfm-3-1.7b:free` | 25.8s | 70/100 | No |
| `alg-02` | Quadratic roots | `particle-ai/particle-1:free` | **5.3s** | **100/100** | **Yes** |
| `alg-03` | Rational inequality | `liquid/lfm-3-1.7b:free` | 37.2s | 65/100 | No |
| `calc-01` | Trigonometric limit | `nvidia/nemotron-3-ultra-550b-a55b:free` | 29.0s | **100/100** | **Yes** |
| `calc-02` | Quadratic optimization | `recursive/flint-v1.0:free` | 21.7s | **100/100** | **Yes** |
