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
