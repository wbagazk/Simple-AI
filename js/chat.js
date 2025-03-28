document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.querySelector('.clear-chat-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const previewModal = document.getElementById('preview-modal');
    const previewFrame = document.getElementById('preview-frame');

    // Auto-focus input
    messageInput.focus();

    // Event Listeners
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);
    clearChatBtn.addEventListener('click', clearChat);
    newChatBtn.addEventListener('click', clearChat);

    // Main Functions
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        const typingIndicator = showTypingIndicator();
        fetchAIResponse(message, typingIndicator);
    }

    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        messageDiv.innerHTML = sender === 'ai' 
            ? `
                <div class="avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    ${formatMessage(content)}
                </div>
            `
            : `
                <div class="avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="message-content">
                    <p>${content}</p>
                </div>
            `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        if (sender === 'ai') {
            applyCodeHighlighting();
            setupCodeButtons();
        }
    }

    function formatMessage(content) {
        // Pisahkan logika untuk deteksi dan pembuatan code block
        const filePattern = /(?:buat|create|file)\s+([\w-]+\.(html|css|js|javascript|py|python))\b([\s\S]*?)(?=\n\n|$)/gi;
        const codeBlocks = [];

        // Tangkap semua code block terlebih dahulu
        content = content.replace(filePattern, (match, filename, ext, code) => {
            const processedCode = createCodeBlock(code.trim(), ext.toLowerCase(), filename);
            codeBlocks.push(processedCode);
            return `{{CODE_BLOCK_${codeBlocks.length - 1}}}`;
        });

        // Tangkap code block dengan ```
        content = content.replace(/```(\w*)([\s\S]*?)```/g, (match, lang, code) => {
            const filename = getFilenameForLanguage(lang);
            const processedCode = createCodeBlock(code.trim(), lang || 'plaintext', filename);
            codeBlocks.push(processedCode);
            return `{{CODE_BLOCK_${codeBlocks.length - 1}}}`;
        });

        // Proses paragraf dan list
        let formatted = content.split('\n\n').map(para => 
            para.startsWith('- ') || para.startsWith('* ') 
                ? `<ul>${
                    para.split('\n').map(item => 
                        `<li>${item.substring(2)}</li>`
                    ).join('')
                  }</ul>`
                : `<p>${para}</p>`
        ).join('');

        // Kembalikan code block ke posisi semula
        codeBlocks.forEach((codeBlock, index) => {
            formatted = formatted.replace(`{{CODE_BLOCK_${index}}}`, codeBlock);
        });

        return formatted;
    }

    function createCodeBlock(code, language, filename) {
        return `
        <div class="code-container">
            <div class="code-header">
                <div class="code-filename">
                    <i class="fas fa-file-code"></i>
                    <span>${filename || getFilenameForLanguage(language)}</span>
                </div>
                <div class="code-actions">
                    <button class="code-btn preview-btn" 
                            data-code="${encodeURIComponent(code)}" 
                            data-lang="${language}">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="code-btn copy-btn">
                        <i class="far fa-copy"></i> Copy
                    </button>
                    <button class="code-btn download-btn" 
                            data-filename="${filename || getFilenameForLanguage(language)}" 
                            data-code="${encodeURIComponent(code)}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
            <div class="code-content">
                <pre><code class="${language}">${escapeHtml(code)}</code></pre>
            </div>
        </div>`;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }

    async function fetchAIResponse(message, typingIndicator) {
        try {
            const apiUrl = `https://api.siputzx.my.id/api/ai/claude-sonnet-35?content=${encodeURIComponent(message)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            removeTypingIndicator(typingIndicator);
            
            if (data.status && data.data) {
                addMessage(data.data, 'ai');
            } else {
                addMessage("Maaf, terjadi kesalahan dalam pemrosesan.", 'ai');
            }
        } catch (error) {
            removeTypingIndicator(typingIndicator);
            addMessage("Error: Gagal terhubung ke server AI", 'ai');
            console.error('API Error:', error);
        }
    }

    // Helper Functions
    function applyCodeHighlighting() {
        document.querySelectorAll('.code-content code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    function setupCodeButtons() {
        // Preview Button
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const code = decodeURIComponent(this.dataset.code);
                const lang = this.dataset.lang;
                
                previewFrame.srcdoc = lang === 'html' 
                    ? code 
                    : `<pre>${escapeHtml(code)}</pre>`;
                
                previewModal.classList.add('show');
            });
        });

        // Copy Button
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const code = this.closest('.code-container').querySelector('code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    const original = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => this.innerHTML = original, 2000);
                });
            });
        });

        // Download Button
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const content = decodeURIComponent(this.dataset.code);
                const filename = this.dataset.filename;
                downloadFile(content, filename);
            });
        });
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function getFilenameForLanguage(lang) {
        const extensions = {
            javascript: 'script.js',
            js: 'script.js',
            python: 'script.py',
            py: 'script.py',
            html: 'index.html',
            css: 'style.css',
            php: 'script.php',
            java: 'Main.java',
            c: 'program.c',
            cpp: 'program.cpp'
        };
        return extensions[lang.toLowerCase()] || 'file.txt';
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function removeTypingIndicator(indicator) {
        indicator?.remove();
    }

    function clearChat() {
        while (chatMessages.children.length > 1) {
            chatMessages.lastChild.remove();
        }
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Modal Close Handler
    previewModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target === previewModal) {
            previewModal.classList.remove('show');
        }
    });
});