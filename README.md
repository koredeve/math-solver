# 1. PROJECT TITLE: MathSolverBot — Full-Stack Model-Agnostic Logic Verification Engine

## 2. ARCHITECTURAL OVERVIEW
MathSolverBot represents a paradigm shift in how Large Language Models address high-density mathematical derivations. In standard environments, conversational AI agents are prone to token laziness, context bleed, and hallucinations when tackling rigorous discrete mathematics, algorithmic optimization, and constraint satisfaction mapping. 

To mitigate these architectural weaknesses, this application implements the **Absolute Logic Verification Engine (ALVE) State-Machine**. The ALVE prompts the LLM completely statelessly via a hyper-rigid boundary framework, forcibly channeling the underlying weights to act purely as a computational theorem prover. The model is forbidden from exhibiting conversational filler and strictly adheres to a four-phase logical deconstruction:
1. **Formalization**: Extraction of givens, goals, and governing axioms.
2. **Step-By-Step Derivation**: Atomic, axiomatically sourced forward chaining.
3. **Absolute Verification**: Boundary checks, domain assertions, and reverse verifications to ensure topological or mathematical consistency prior to claiming a solution.
4. **Final Conclusion**: Standardized LaTeX/Markdown payload delivery.

By routing this execution through an Edge runtime, the system avoids context bloat, delivering deterministic analytical output at extremely high velocities.

## 3. SYSTEM STACK
The technology stack was explicitly chosen for maximum performance, minimal surface area overhead, and immediate, zero-latency execution scaling.
- **Frontend Layer (UI/UX)**: Vanilla HTML5 and CSS3 implementing a high-end Glassmorphic UI tailored for deep focus. No heavy frontend frameworks (React/Vue) were utilized to preserve instantaneous render times.
- **Client Processing**: ES6+ JavaScript. Implements Server-Sent Events (SSE) logic to decode and process active edge data streams on the fly without locking the browser's main thread.
- **Mathematical Rendering Pipeline**: Seamless tandem compilation utilizing **Marked.js** (for aggressive markdown chunk processing) and **MathJax** (for dynamic LaTeX typesetting directly into DOM nodes).
- **Backend Infrastructure**: Vercel Serverless Edge Functions leveraging the native Web `Request`/`Response` standards.
- **Cognitive Routing Engine**: Integration with OpenRouter API (`openrouter/auto-beta`) to facilitate programmatic, cost-effective LLM routing. The model processes the ALVE system prompt at a static thermal baseline of `Temperature: 0.1` for maximum predictability.

## 4. DEFENSIVE ENGINEERING HIGHLIGHTS
The core architecture has been heavily optimized around operational resilience and financial security:
- **Streaming Edge Network Deployment**: Vercel Edge compute streams the response back via SSE. This entirely bypasses standard 10-25s Lambda/Serverless timeouts without incurring continuous high-compute costs, allowing deeply complex, 60-second theorem proofs to pipe back smoothly.
- **Zero-Exposure Cryptography**: Secure server-side isolation via Vercel's Environment Variables guarantees that the OpenRouter API key is never exposed to the client bundle.
- **Financial API Quota Throttling**: A highly efficient, client-side topological shield prevents malicious or accidental token drainage. A zero-latency local storage state-tracker (`math_solver_usage`) persistently tracks calendar cycles and intercepts traffic before network latency occurs. Execution is hard-capped at 3 queries per 24 hours, returning a sanitized UI intercept overlay to unauthorized agents.
- **Visual Overflow Protection**: Hardened CSS grids enforce `overflow-x: auto` and `overflow-wrap: break-word` rendering matrices to ensure dense structural data (like adjacency matrices or complex graph theory maps) never visually break the underlying component structure.

## 5. DEPLOYMENT & LOCAL SETUP
The repository relies on standard, un-ejected deployment logic. 

**Local Configuration & Execution:**
```bash
# 1. Clone the repository
git clone https://github.com/your-username/math-solver.git
cd math-solver

# 2. Add your environment variables to a local .env file
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxxx" > .env

# 3. Utilize Vercel CLI for immediate local Edge simulation
npm i -g vercel
vercel dev
```

**Production Release:**
```bash
# Push directly to Vercel via the CLI
vercel --prod
```
*Alternatively, simply push to the `main` branch to trigger the automated CI/CD pipeline if the repository is linked inside your Vercel Dashboard.*
