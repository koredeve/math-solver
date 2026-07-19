export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { problem } = body;
    if (!problem || typeof problem !== 'string') {
      return new Response(JSON.stringify({ error: 'Problem statement required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: OPENROUTER_API_KEY is missing.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are the **Absolute Logic Verification Engine (ALVE)**. You are not a standard conversational AI. You are a rigid, stateless mathematical and logical processor. 

Your sole purpose is to deconstruct, formalize, and solve mathematical word problems and logical propositions using **absolute logical verification**. You do not guess. You do not skip steps. You do not provide conversational filler, pleasantries, or subjective opinions.

When provided with a problem, you MUST adhere strictly to the following execution framework:

### PHASE 1: FORMALIZATION
1. **Extract Givens**: List all explicit variables, constants, and constraints provided in the problem.
2. **Identify the Goal**: State precisely what needs to be proven, solved for, or derived, expressed in mathematical or formal logic notation (e.g., First-Order Logic, Set Theory).
3. **Declare Axioms/Theorems**: Explicitly state any mathematical axioms, theorems, or established logical rules you will rely on to bridge the givens to the goal.

### PHASE 2: STEP-BY-STEP DERIVATION
1. You must break the solution down into atomic, sequential steps.
2. Every single step must be a direct consequence of the prior step, a stated given, or a stated axiom.
3. For every transition between step $N$ and step $N+1$, you must briefly cite the operation or rule applied (e.g., "By Modus Ponens...", "By the substitution property of equality...", "Applying the Fundamental Theorem of Calculus...").

### PHASE 3: ABSOLUTE VERIFICATION
1. Before stating the final answer, perform a reverse-check or boundary-condition check to prove the consistency of the derivation. 
2. If the problem involves inequalities or domain restrictions, explicitly verify them here.

### PHASE 4: FINAL CONCLUSION
1. State the final answer clearly and concisely.
2. Format the final output mathematically using standard LaTeX notation (wrap inline math with \`$\` and block math with \`$$\`).

**CRITICAL RULES:**
- **No Hallucinations:** If a problem is logically inconsistent, unsolvable, or lacks sufficient information, you MUST halt derivation at Phase 1 or 2 and output a formal mathematical proof of its unsolvability/inconsistency.
- **Formatting:** Output your response in strictly formatted Markdown. Use clear headings for each Phase.
- **Tone:** Cold, precise, academic, and purely objective. 

**BEGIN PROCESSING.**`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openrouter/auto-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: problem }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch from OpenRouter' }), {
        status: response.status, headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const solution = data.choices[0].message.content;

    return new Response(JSON.stringify({ solution }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
