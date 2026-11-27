import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAlveConclusion, gradeAlveResponse } from '../lib/alve_rubric.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarkPath = path.join(__dirname, '..', 'benchmarks', 'alve_benchmark.json');

const VALID_ALVE_RESPONSE = `
### PHASE 1: FORMALIZATION
1. **Extract Givens**: $\\sqrt{x+3} = x - 3$, $x \\in \\mathbb{R}$.
2. **Identify the Goal**: Find all real $x$ satisfying the equation.
3. **Declare Axioms/Theorems**: Domain of principal square root ($x - 3 \\ge 0$).

### PHASE 2: STEP-BY-STEP DERIVATION
1. Square both sides: $x + 3 = (x - 3)^2 = x^2 - 6x + 9$.
2. Rearrange: $x^2 - 7x + 6 = 0 \\implies (x - 6)(x - 1) = 0$.

### PHASE 3: ABSOLUTE VERIFICATION
- Check $x = 1$: $\\sqrt{4} = 2 \\ne 1 - 3 = -2$ (extraneous).
- Check $x = 6$: $\\sqrt{9} = 3 = 6 - 3$ (valid).

### PHASE 4: FINAL CONCLUSION
> **FINAL ANSWER:** x = 6

$$x = 6$$
`;

test('gradeAlveResponse passes a compliant 4-phase derivation with score 100', () => {
  const result = gradeAlveResponse(VALID_ALVE_RESPONSE);
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
  assert.equal(result.inOrder, true);
  assert.equal(result.finalAnswer, 'x = 6');
  assert.equal(result.displayLatex, 'x = 6');
  assert.deepEqual(result.errors, []);
});

test('gradeAlveResponse flags missing phases and missing final answer', () => {
  const incomplete = '### PHASE 1: FORMALIZATION\nGivens: x = 1.';
  const result = gradeAlveResponse(incomplete);
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('MISSING_PHASE_2'));
  assert.ok(result.errors.includes('MISSING_FINAL_ANSWER'));
  assert.ok(result.errors.includes('MISSING_LATEX'));
});

test('gradeAlveResponse detects out-of-order phases', () => {
  const outOfOrder = `
### PHASE 2: STEP-BY-STEP DERIVATION
Step 1.
### PHASE 1: FORMALIZATION
Givens.
### PHASE 3: ABSOLUTE VERIFICATION
Checked.
### PHASE 4: FINAL CONCLUSION
> **FINAL ANSWER:** 42
$$42$$
`;
  const result = gradeAlveResponse(outOfOrder);
  assert.equal(result.passed, false);
  assert.equal(result.inOrder, false);
  assert.ok(result.errors.includes('OUT_OF_ORDER'));
});

test('gradeAlveResponse validates unsolvable problem halt', () => {
  const halted = `
### PHASE 1: FORMALIZATION
Givens: $x + y = 5$ and $2x + 2y = 12$.
Multiplying the first equation by 2 yields $2x + 2y = 10 \\ne 12$.
This system is inconsistent and unsolvable; halting derivation.
`;
  const passResult = gradeAlveResponse(halted, { expectUnsolvable: true });
  assert.equal(passResult.passed, true);
  assert.equal(passResult.score, 100);

  const failResult = gradeAlveResponse('### PHASE 1: FORMALIZATION\nAnswer is 5.', { expectUnsolvable: true });
  assert.equal(failResult.passed, false);
  assert.ok(failResult.errors.includes('UNSOLVABLE_NOT_HALTED'));
});

test('extractAlveConclusion returns nulls for invalid input', () => {
  assert.deepEqual(extractAlveConclusion(null), { finalAnswer: null, displayLatex: null });
});

test('alve_benchmark.json has 15 valid, unique benchmark items', () => {
  const items = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  assert.equal(items.length, 15);
  const ids = new Set();
  for (const item of items) {
    assert.ok(item.id && !ids.has(item.id), `Duplicate or missing id: ${item.id}`);
    ids.add(item.id);
    assert.equal(typeof item.category, 'string');
    assert.equal(typeof item.prompt, 'string');
    assert.equal(typeof item.expectUnsolvable, 'boolean');
    assert.equal(typeof item.expectedAnswer, 'string');
  }
  const unsolvableCount = items.filter((i) => i.expectUnsolvable).length;
  assert.equal(unsolvableCount, 3);
});
