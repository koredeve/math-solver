document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solve-btn');
    const problemInput = document.getElementById('problem-input');
    const outputWindow = document.getElementById('output-window');
    const spinner = document.getElementById('loading-spinner');
    const btnText = solveBtn.querySelector('.btn-text');
    const statusIndicator = document.getElementById('status-indicator');
    const copyBtn = document.getElementById('copy-btn');
    const demoBtns = document.querySelectorAll('.demo-btn');

    let currentResult = ''; // Store the latest result for copying

    // Demo Prompts Library
    const prompts = {
        'River Crossing Puzzle': 'A farmer needs to cross a river with a wolf, a goat, and a box of math books. The boat can only hold the farmer and one item at a time. If left alone, the wolf will eat the goat. The goat cannot be left alone with the math books because it will chew them up. How does the farmer get everything across safely? Formalize the constraints, map out every single trip step-by-step, and mathematically verify that no forbidden states occur at any point.',
        'Calculus Proof': 'Prove that the derivative of e^x is e^x using the limit definition of a derivative. Be extremely rigorous and cite all algebraic limits.',
        'Hardest Logic Riddle': 'There are three gods A, B, and C, who are called, in no particular order, True, False, and Random. True always speaks truly, False always speaks falsely, but whether Random speaks truly or falsely is a completely random coin toss. Determine the identities of A, B, and C by asking exactly three yes-no questions.'
    };

    demoBtns.forEach(btn => {
        if (prompts[btn.textContent]) {
            btn.addEventListener('click', () => {
                problemInput.value = prompts[btn.textContent];
                // Optional: Automatically click solve when a demo is clicked
                // solveBtn.click();
            });
        }
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        if (!currentResult) return;
        navigator.clipboard.writeText(currentResult).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    });

    // Configure marked to handle Markdown formatting safely
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    solveBtn.addEventListener('click', async () => {
        const problem = problemInput.value.trim();
        
        if (!problem) {
            problemInput.style.transform = 'translateX(5px)';
            setTimeout(() => problemInput.style.transform = 'translateX(-5px)', 100);
            setTimeout(() => problemInput.style.transform = 'translateX(0)', 200);
            return;
        }

        // --- LOCALSTORAGE SECURITY THROTTLING ---
        const today = new Date().toISOString().split('T')[0];
        let usage = JSON.parse(localStorage.getItem('math_solver_usage') || '{"date":"","count":0}');
        
        if (usage.date !== today) {
            usage = { date: today, count: 0 };
        }
        
        if (usage.count >= 3) {
            outputWindow.innerHTML = `
                <div class="glass-panel" style="border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.1); padding: 1.5rem;">
                    <h3 style="color: #ef4444; margin-bottom: 0.5rem; font-weight: 600; font-size: 1.1rem;">Daily demo threshold reached (3/3 queries used).</h3>
                    <p style="color: var(--text-primary); line-height: 1.5;">To protect API resources, this public link limits requests to 3 per day.</p>
                </div>
            `;
            statusIndicator.textContent = 'Limit Reached';
            statusIndicator.className = 'status-indicator';
            return;
        }

        usage.count += 1;
        localStorage.setItem('math_solver_usage', JSON.stringify(usage));
        // ----------------------------------------

        solveBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Computing...';
        statusIndicator.textContent = 'Computing';
        statusIndicator.className = 'status-indicator computing';
        copyBtn.style.display = 'none'; // Hide copy button while computing
        currentResult = ''; // Reset result buffer
        
        outputWindow.innerHTML = '<p class="placeholder-text">Analyzing logical structure and deriving proof...</p>';

        try {
            // Hit our backend serverless function
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem })
            });
            
            const contentType = response.headers.get("content-type");
            
            // Handle regular JSON errors safely
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch solution');
            }
            
            // Handle Vercel HTML timeout errors safely
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Vercel/Server Error: ${text.substring(0, 100)}...`);
            }

            // Read the Server-Sent Events (SSE) Stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';
            let buffer = '';
            let usedModel = 'OpenRouter'; // Track which model was actually used
            
            outputWindow.innerHTML = '<p class="placeholder-text">Starting derivation...</p>';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep the last potentially incomplete line in the buffer
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.model) usedModel = data.model; // Extract the actual model name
                            const text = data.choices[0].delta?.content || '';
                            result += text;
                            
                            // Render Markdown live with a typing cursor
                            outputWindow.innerHTML = marked.parse(result + ' ▊');
                        } catch (e) {
                            // Silently ignore incomplete JSON chunks
                        }
                    }
                }
            }

            // Remove cursor and do final render
            outputWindow.innerHTML = marked.parse(result);

            // Trigger MathJax only AFTER the stream finishes to prevent lag/flickering
            if (window.MathJax) {
                MathJax.typesetPromise([outputWindow]).catch((err) => console.error('MathJax error:', err));
            }

            statusIndicator.textContent = `Verified (${usedModel})`;
            statusIndicator.title = `Model used: ${usedModel}`;
            statusIndicator.className = 'status-indicator done';
            
            // Show the copy button now that the stream is finished
            copyBtn.style.display = 'block';
            currentResult = result;

        } catch (error) {
            outputWindow.innerHTML = `<p style="color: #ef4444;">Error during computation: ${error.message}</p>`;
            statusIndicator.textContent = 'Error';
            statusIndicator.className = 'status-indicator';
        } finally {
            solveBtn.disabled = false;
            spinner.classList.add('hidden');
            btnText.textContent = 'Verify & Solve';
        }
    });

    problemInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            solveBtn.click();
        }
    });
});
