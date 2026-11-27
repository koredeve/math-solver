/**
 * Deterministic ALVE (Absolute Logic Verification Engine) Rubric Grader.
 * Evaluates whether an LLM derivation adheres to the 4-phase verification contract.
 */

const PHASE_PATTERNS = [
  { key: 'PHASE_1', regex: /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?PHASE\s*1\s*[:\-—]\s*FORMALIZATION/i },
  { key: 'PHASE_2', regex: /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?PHASE\s*2\s*[:\-—]\s*STEP-BY-STEP\s*DERIVATION/i },
  { key: 'PHASE_3', regex: /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?PHASE\s*3\s*[:\-—]\s*ABSOLUTE\s*VERIFICATION/i },
  { key: 'PHASE_4', regex: /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?PHASE\s*4\s*[:\-—]\s*FINAL\s*CONCLUSION/i },
];

const HALT_REGEX = /\b(unsolvable|inconsistent|contradiction|no\s+real\s+solution|insufficient\s+information|halt)\b/i;
const FINAL_ANSWER_REGEX = /(?:>|\*\*|\b)FINAL\s*ANSWER\s*:\s*\*?\*?\s*(.+)/i;
const DISPLAY_LATEX_REGEX = /(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/;

/**
 * Extract the final answer text and display LaTeX block from an ALVE response.
 * @param {string} markdown
 * @returns {{ finalAnswer: string | null, displayLatex: string | null }}
 */
export function extractAlveConclusion(markdown) {
  if (typeof markdown !== 'string') {
    return { finalAnswer: null, displayLatex: null };
  }
  const answerMatch = markdown.match(FINAL_ANSWER_REGEX);
  const latexMatch = markdown.match(DISPLAY_LATEX_REGEX);
  const displayLatex = latexMatch ? (latexMatch[1] ?? latexMatch[2] ?? '').trim() : null;
  return {
    finalAnswer: answerMatch ? answerMatch[1].trim() : null,
    displayLatex,
  };
}

/**
 * Grade a model response against the deterministic ALVE rubric.
 * @param {string} markdown
 * @param {{ expectUnsolvable?: boolean }} [options]
 * @returns {{
 *   passed: boolean,
 *   score: number,
 *   phasesFound: string[],
 *   inOrder: boolean,
 *   finalAnswer: string | null,
 *   displayLatex: string | null,
 *   errors: string[]
 * }}
 */
export function gradeAlveResponse(markdown, options = {}) {
  const { expectUnsolvable = false } = options;
  const errors = [];

  if (typeof markdown !== 'string' || markdown.trim().length === 0) {
    return {
      passed: false,
      score: 0,
      phasesFound: [],
      inOrder: false,
      finalAnswer: null,
      displayLatex: null,
      errors: ['EMPTY_RESPONSE'],
    };
  }

  const positions = [];
  const phasesFound = [];

  for (const phase of PHASE_PATTERNS) {
    const match = phase.regex.exec(markdown);
    if (match) {
      phasesFound.push(phase.key);
      positions.push(match.index);
    }
  }

  // Check ordering of found phases
  let inOrder = true;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) {
      inOrder = false;
      break;
    }
  }
  if (!inOrder) {
    errors.push('OUT_OF_ORDER');
  }

  const { finalAnswer, displayLatex } = extractAlveConclusion(markdown);
  const halted = HALT_REGEX.test(markdown);

  if (expectUnsolvable) {
    // Unsolvable problems must include Phase 1 and explicitly halt on inconsistency
    if (!phasesFound.includes('PHASE_1')) {
      errors.push('MISSING_PHASE_1');
    }
    if (!halted) {
      errors.push('UNSOLVABLE_NOT_HALTED');
    }
    const score =
      (phasesFound.includes('PHASE_1') ? 40 : 0) +
      (halted ? 60 : 0);
    return {
      passed: errors.length === 0,
      score,
      phasesFound,
      inOrder,
      finalAnswer,
      displayLatex,
      errors,
    };
  }

  // Solvable problems require all 4 phases in order + FINAL ANSWER + display LaTeX
  for (const phase of PHASE_PATTERNS) {
    if (!phasesFound.includes(phase.key)) {
      errors.push(`MISSING_${phase.key}`);
    }
  }
  if (!finalAnswer) {
    errors.push('MISSING_FINAL_ANSWER');
  }
  if (!displayLatex) {
    errors.push('MISSING_LATEX');
  }

  let score = phasesFound.length * 15; // up to 60 for 4 phases
  if (inOrder && phasesFound.length >= 2) score += 10;
  if (finalAnswer) score += 20;
  if (displayLatex) score += 10;

  return {
    passed: errors.length === 0,
    score: Math.min(100, score),
    phasesFound,
    inOrder,
    finalAnswer,
    displayLatex,
    errors,
  };
}
