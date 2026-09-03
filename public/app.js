document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solve-btn');
    const problemInput = document.getElementById('problem-input');
    const outputWindow = document.getElementById('output-window');
    const spinner = document.getElementById('loading-spinner');
    const btnText = solveBtn.querySelector('.btn-text');
    const statusIndicator = document.getElementById('status-indicator');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const demoBtns = document.querySelectorAll('.demo-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const quotaCount = document.getElementById('quota-count');
    const resultShowcase = document.getElementById('result-showcase');
    const resultContent = document.getElementById('result-content');

    let currentResult = ''; // Store the latest result for copying
    let currentBase64Image = null; // Store compressed image data
    const DAILY_LIMIT = 3;

    // --- Quota Display Helper ---
    function updateQuotaDisplay() {
        if (!quotaCount) return;
        const today = new Date().toISOString().split('T')[0];
        const usage = JSON.parse(localStorage.getItem('math_solver_usage') || '{"date":"","count":0}');
        const count = usage.date === today ? usage.count : 0;
        const remaining = Math.max(0, DAILY_LIMIT - count);
        quotaCount.textContent = `${remaining}/${DAILY_LIMIT}`;
        if (remaining === 0) {
            quotaCount.style.color = '#f43f5e';
        } else {
            quotaCount.style.color = '#a5b4fc';
        }
    }
    updateQuotaDisplay();

    // --- Auto-Expanding Textarea (Chat-style) ---
    function autoResizeTextarea() {
        problemInput.style.height = 'auto';
        problemInput.style.height = Math.min(problemInput.scrollHeight, 180) + 'px';
    }
    problemInput.addEventListener('input', autoResizeTextarea);

    // --- Image Upload Handling & Compression ---
    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    
                    currentBase64Image = compressedDataUrl;
                    imagePreview.src = compressedDataUrl;
                    imagePreviewContainer.classList.remove('hidden');
                    problemInput.focus();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            currentBase64Image = null;
            imageUpload.value = '';
            imagePreviewContainer.classList.add('hidden');
            imagePreview.src = '';
        });
    }

    // --- Demo Prompts Library ---
    const prompts = {
        'River Crossing Puzzle': 'A farmer needs to cross a river with a wolf, a goat, and a box of math books. The boat can only hold the farmer and one item at a time. If left alone, the wolf will eat the goat. The goat cannot be left alone with the math books because it will chew them up. How does the farmer get everything across safely? Formalize the constraints, map out every single trip step-by-step, and mathematically verify that no forbidden states occur at any point.',
        'Calculus Proof': 'Prove that the derivative of e^x is e^x using the limit definition of a derivative. Be extremely rigorous and cite all algebraic limits.',
        'Hardest Logic Riddle': 'There are three gods A, B, and C, who are called, in no particular order, True, False, and Random. True always speaks truly, False always speaks falsely, but whether Random speaks truly or falsely is a completely random coin toss. Determine the identities of A, B, and C by asking exactly three yes-no questions.'
    };

    demoBtns.forEach(btn => {
        const titleEl = btn.querySelector('.card-title') || btn;
        const key = titleEl.textContent.trim();
        if (prompts[key]) {
            btn.addEventListener('click', () => {
                problemInput.value = prompts[key];
                autoResizeTextarea();
                problemInput.focus();
            });
        }
    });

    // --- Enter Key to Submit (Shift+Enter for newline) ---
    problemInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            solveBtn.click();
        }
    });

    // --- Copy to Clipboard ---
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!currentResult) return;
            navigator.clipboard.writeText(currentResult).then(() => {
                const textSpan = copyBtn.querySelector('span');
                const prev = textSpan ? textSpan.textContent : copyBtn.textContent;
                if (textSpan) textSpan.textContent = 'Copied!';
                else copyBtn.textContent = 'Copied!';
                
                setTimeout(() => {
                    if (textSpan) textSpan.textContent = prev;
                    else copyBtn.textContent = prev;
                }, 2000);
            });
        });
    }

    // --- Clear Output ---
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentResult = '';
            if (resultShowcase) resultShowcase.classList.add('hidden');
            if (resultContent) resultContent.innerHTML = '';
            outputWindow.innerHTML = `
                <div class="empty-state">
                    <div class="empty-glyph">&int;</div>
                    <p>Logical derivations, mathematical proofs, and verification steps will stream here in real time.</p>
                </div>
            `;
            statusIndicator.textContent = 'Ready';
            statusIndicator.className = 'status-indicator';
            copyBtn.style.display = 'none';
            clearBtn.style.display = 'none';
        });
    }

    // Configure marked to handle Markdown formatting safely
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // --- Advanced Mathematical Markdown & KaTeX Engine ---
    function renderMarkdownWithMath(markdownText) {
        if (!markdownText) return '';
        
        const mathBlocks = [];
        
        // 1. Extract and protect display math $$...$$
        let processed = markdownText.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
            const id = `___MATH_BLOCK_${mathBlocks.length}___`;
            mathBlocks.push({ id, math: math.trim(), display: true });
            return `\n\n${id}\n\n`;
        });

        // 2. Extract and protect display math \[...\]
        processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
            const id = `___MATH_BLOCK_${mathBlocks.length}___`;
            mathBlocks.push({ id, math: math.trim(), display: true });
            return `\n\n${id}\n\n`;
        });

        // 3. Extract and protect inline math $...$
        processed = processed.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, math) => {
            const id = `___MATH_INLINE_${mathBlocks.length}___`;
            mathBlocks.push({ id, math: math.trim(), display: false });
            return id;
        });

        // 4. Extract and protect inline math \(...\)
        processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
            const id = `___MATH_INLINE_${mathBlocks.length}___`;
            mathBlocks.push({ id, math: math.trim(), display: false });
            return id;
        });

        // 5. Parse clean markdown without mangling math symbols
        let html = marked.parse(processed);

        // 6. Substitute protected math with rendered KaTeX formulas
        for (const item of mathBlocks) {
            let renderedMath = '';
            if (window.katex && window.katex.renderToString) {
                try {
                    renderedMath = window.katex.renderToString(item.math, {
                        displayMode: item.display,
                        throwOnError: false
                    });
                } catch (err) {
                    renderedMath = item.display ? 
                        `<div class="katex-display">$$${item.math}$$</div>` : 
                        `<span class="katex">$${item.math}$</span>`;
                }
            } else {
                renderedMath = item.display ? 
                    `<div class="katex-display">$$${item.math}$$</div>` : 
                    `<span class="katex">$${item.math}$</span>`;
            }
            
            // Replace placeholder in HTML
            html = html.split(item.id).join(renderedMath);
        }

        return html;
    }

    // --- Extract and Highlight Final Verified Answer ---
    function extractFinalAnswer(text) {
        if (!text) return null;
        
        // Search for explicit Phase 4 block
        const phase4Match = text.match(/###\s*PHASE\s*4[^\n]*\n([\s\S]*)/i);
        if (phase4Match && phase4Match[1]) {
            let content = phase4Match[1].trim();
            // Remove trailing rules or notes
            content = content.replace(/\*\*CRITICAL RULES[\s\S]*/i, '').trim();
            return content;
        }

        // Search for explicit FINAL ANSWER / RESULT callouts
        const finalAnswerMatch = text.match(/(?:>|\*\*|\b)(?:FINAL\s*(?:ANSWER|RESULT|CONCLUSION))\s*:\s*([\s\S]*)/i);
        if (finalAnswerMatch && finalAnswerMatch[1]) {
            return finalAnswerMatch[1].trim();
        }

        return null;
    }

    function updateResultShowcase(text) {
        if (!resultShowcase || !resultContent) return;
        const answer = extractFinalAnswer(text);
        if (answer) {
            resultContent.innerHTML = renderMarkdownWithMath(answer);
            resultShowcase.classList.remove('hidden');
        } else {
            resultShowcase.classList.add('hidden');
        }
    }

    // --- Solver Execution Flow ---
    solveBtn.addEventListener('click', async () => {
        const problem = problemInput.value.trim();
        
        if (!problem && !currentBase64Image) {
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
        
        if (usage.count >= DAILY_LIMIT) {
            outputWindow.innerHTML = `
                <div style="border: 1px solid rgba(244, 63, 94, 0.4); background: rgba(244, 63, 94, 0.08); padding: 1.5rem; border-radius: 0.75rem;">
                    <h3 style="color: #f43f5e; margin-bottom: 0.5rem; font-weight: 600; font-size: 1.1rem; border-left: none; padding-left: 0;">Daily Demo Threshold Reached (3/3 queries used)</h3>
                    <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 0;">To protect financial API resources, this public solver demo limits anonymous requests to 3 per calendar day. Access resets automatically at midnight.</p>
                </div>
            `;
            statusIndicator.textContent = 'Limit Reached';
            statusIndicator.className = 'status-indicator';
            updateQuotaDisplay();
            return;
        }

        usage.count += 1;
        localStorage.setItem('math_solver_usage', JSON.stringify(usage));
        updateQuotaDisplay();
        // ----------------------------------------

        // UI Loading State
        solveBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.style.display = 'none';
        statusIndicator.textContent = 'Deriving Proof...';
        statusIndicator.className = 'status-indicator computing';
        if (copyBtn) copyBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        if (resultShowcase) resultShowcase.classList.add('hidden');
        currentResult = ''; // Reset result buffer
        
        outputWindow.innerHTML = '<p class="placeholder-text" style="color: #94a3b8; font-style: italic;">Engaging ALVE Engine. Formalizing axioms, mapping state space, and deriving logical steps...</p>';

        try {
            // Trigger API request
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem, image: currentBase64Image })
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
            
            outputWindow.innerHTML = '<p class="placeholder-text" style="color: #94a3b8; font-style: italic;">Beginning formal derivation stream...</p>';

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
                            if (data.model) usedModel = data.model; // Extract model name
                            const text = data.choices[0].delta?.content || '';
                            result += text;
                            
                            // Render Markdown live with KaTeX and typing cursor
                            outputWindow.innerHTML = renderMarkdownWithMath(result + ' <span style="color: #6366f1; animation: pulse 1s infinite;">▊</span>');
                            updateResultShowcase(result);
                        } catch (e) {
                            // Silently ignore incomplete JSON chunks
                        }
                    }
                }
            }

            // Remove cursor and do final complete render
            outputWindow.innerHTML = renderMarkdownWithMath(result);
            updateResultShowcase(result);

            // Trigger fallback MathJax if present
            if (window.MathJax && window.MathJax.typesetPromise) {
                MathJax.typesetPromise([outputWindow, resultShowcase]).catch(() => {});
            }

            statusIndicator.textContent = `Verified (${usedModel})`;
            statusIndicator.title = `Model used: ${usedModel}`;
            statusIndicator.className = 'status-indicator done';
            
            // Show action buttons now that stream has completed
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            if (clearBtn) clearBtn.style.display = 'inline-flex';
            currentResult = result;

            // Clear input after successful send
            problemInput.value = '';
            autoResizeTextarea();
            if (currentBase64Image && removeImageBtn) {
                removeImageBtn.click();
            }

        } catch (error) {
            outputWindow.innerHTML = `
                <div style="border: 1px solid rgba(244, 63, 94, 0.3); background: rgba(244, 63, 94, 0.06); padding: 1.25rem; border-radius: 0.75rem;">
                    <p style="color: #f43f5e; margin: 0;">Error during computation: ${error.message}</p>
                </div>
            `;
            statusIndicator.textContent = 'Error';
            statusIndicator.className = 'status-indicator';
        } finally {
            solveBtn.disabled = false;
            spinner.classList.add('hidden');
            btnText.style.display = 'inline-flex';
        }
    });
});
