document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solve-btn');
    const problemInput = document.getElementById('problem-input');
    const outputWindow = document.getElementById('output-window');
    const spinner = document.getElementById('loading-spinner');
    const btnText = solveBtn.querySelector('.btn-text');
    const statusIndicator = document.getElementById('status-indicator');

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

        solveBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Computing...';
        statusIndicator.textContent = 'Computing';
        statusIndicator.className = 'status-indicator computing';
        
        outputWindow.innerHTML = '<p class="placeholder-text">Analyzing logical structure and deriving proof...</p>';

        try {
            // Hit our backend serverless function
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch solution');
            }
            
            const result = data.solution;
            
            // Render Markdown
            const htmlContent = marked.parse(result.trim());
            outputWindow.innerHTML = htmlContent;

            // Trigger MathJax to re-render equations in the new HTML
            if (window.MathJax) {
                MathJax.typesetPromise([outputWindow]).catch((err) => console.error('MathJax error:', err));
            }

            statusIndicator.textContent = 'Verified';
            statusIndicator.className = 'status-indicator done';

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
