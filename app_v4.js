/**
 * ============================================================================
 * Adra Product Studio - AI Assistant (v2)
 * Optimized for n8n AI Agent Workflow
 * ============================================================================
 */

// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Current n8n Webhook URL
    WEBHOOK_URL: 'https://vinod2.app.n8n.cloud/webhook/chatbot',

    // Python Agent URL
    PYTHON_AGENT_URL: 'http://localhost:8000/chat',

    // Fields to monitor for extraction feedback
    QUALIFICATION_FIELDS: [
        'name', 'email', 'company', 'product_idea',
        'budget', 'timeline', 'market', 'kpi',
        'expectations', 'stage', 'urgency'
    ]
};

// ===================================
// State Management
// ===================================
const state = {
    sessionId: localStorage.getItem('adra_session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    capturedFields: new Set(),
    isProcessing: false,
    selectedFile: null
};

// PERSIST SESSION ID
localStorage.setItem('adra_session_id', state.sessionId);

// ===================================
// DOM Elements
// ===================================
const elements = {
    openingScreen: document.getElementById('opening-screen'),
    chatScreen: document.getElementById('chat-screen'),
    continueBtn: document.getElementById('continue-btn'),
    messagesArea: document.getElementById('messages-area'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    typingIndicator: document.getElementById('typing-indicator'),
    adraLogo: document.getElementById('adra-logo'),
    insightCount: document.getElementById('insight-count'),
    fileInput: document.getElementById('file-input'),
    uploadBtn: document.getElementById('upload-btn'),
    filePreview: document.getElementById('file-preview'),
    removeFileBtn: document.getElementById('remove-file-btn'),
    micBtn: document.getElementById('mic-btn'),
    botTitle: document.getElementById('bot-title'),
    botSubtitle: document.getElementById('bot-subtitle')
};

// ===================================
// Premium UI Animations
// ===================================
const UI = {
    transitionToChat() {
        elements.openingScreen.classList.remove('active');
        setTimeout(() => {
            elements.chatScreen.classList.add('active');
            elements.messageInput.focus();
            
            // Unified greeting
            elements.botTitle.textContent = 'Adra Unified Assistant';
            elements.botSubtitle.textContent = 'Intelligent Lead & Data Assistant';
            UI.addMessage("✨ Welcome to Adra. How can I assist you with your project or general inquiries today?", true);
        }, 500);
    },

    showFilePreview(file) {
        state.selectedFile = file;
        elements.filePreview.querySelector('.file-name').textContent = file.name;
        elements.filePreview.classList.remove('hidden');
    },

    hideFilePreview() {
        state.selectedFile = null;
        elements.fileInput.value = '';
        elements.filePreview.classList.add('hidden');
    },

    addMessage(text, isAI = false) {
        const isUser = !isAI;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isAI ? 'ai-message' : 'user-message'}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble glass-card';

        // 4. Message Content
        const weatherData = WeatherService.parse(text);
        const timeData = TimeService.detectTimeResponse(text);
        let content;

        if (isAI && (weatherData || timeData)) {
            // Show a combined container for cards
            content = document.createElement('div');
            content.style.display = 'flex';
            content.style.flexDirection = 'column';
            content.style.gap = '12px';

            if (timeData) {
                content.appendChild(TimeService.createCard(timeData));
            }
            if (weatherData) {
                content.appendChild(WeatherService.createCard(weatherData));
            }
        } else {
            content = document.createElement('div');
            content.className = 'md-content';
            content.innerHTML = MarkdownRenderer.render(text);
        }

        const location = TimeService.detectLocation(text);
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';

        if (location) {
            timestamp.textContent = `${TimeService.getLocalizedTime(location.tz)} (${location.name})`;
        } else {
            timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        bubble.appendChild(content);
        wrapper.appendChild(bubble);
        wrapper.appendChild(timestamp);
        messageDiv.appendChild(wrapper);
        elements.messagesArea.appendChild(messageDiv);

        // Auto-scroll
        elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;

        // Initialize swipe gesture
        GestureController.initSwipe(messageDiv, wrapper);

        return messageDiv;
    },

    setLoading(loading) {
        state.isProcessing = loading;
        elements.typingIndicator.classList.toggle('hidden', !loading);
        elements.sendBtn.disabled = loading;
        if (!loading) elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
    },

    triggerInsightAnimation(fieldName) {
        if (!state.capturedFields.has(fieldName)) {
            state.capturedFields.add(fieldName);

            // Pulse logo
            elements.adraLogo.classList.add('insight-captured');
            setTimeout(() => elements.adraLogo.classList.remove('insight-captured'), 600);

            // Update counter if visible
            if (elements.insightCount) {
                elements.insightCount.textContent = state.capturedFields.size;
                elements.insightCount.style.transform = 'scale(1.4)';
                setTimeout(() => elements.insightCount.style.transform = 'scale(1)', 300);
            }

            console.log(`✨ Insight Captured: ${fieldName}`);
        }
    },

    // ===================================
    // New Premium UI Features
    // ===================================
    showQuickReplies(options) {
        const container = document.createElement('div');
        container.className = 'quick-replies';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn';
            btn.textContent = option.label;
            btn.onclick = () => {
                elements.messageInput.value = option.value;
                container.remove(); // Remove options after selection
                handleSend();       // Auto-send
            };
            container.appendChild(btn);
        });

        elements.messagesArea.appendChild(container);
        elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
    },

    clearQuickReplies() {
        const replies = document.querySelectorAll('.quick-replies');
        replies.forEach(r => r.remove());
    },

    showOtpInput() {
        if (document.querySelector('.otp-container')) return; // Already showing

        const container = document.createElement('div');
        container.className = 'otp-container';

        // Label
        const label = document.createElement('div');
        label.className = 'otp-label';
        label.textContent = 'Enter 6-Digit PIN';
        container.appendChild(label);

        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'otp-inputs';

        const inputs = [];
        for (let i = 0; i < 6; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 1;
            input.className = 'otp-digit';
            input.dataset.index = i;
            inputs.push(input);
            inputsDiv.appendChild(input);

            // Handle input logic for auto-advance and backspace
            input.addEventListener('input', (e) => {
                // Ensure only numbers
                e.target.value = e.target.value.replace(/[^0-9]/g, '');

                // Toggle filled state
                e.target.classList.toggle('filled', e.target.value.length === 1);

                if (e.target.value && i < 5) {
                    inputs[i + 1].focus();
                }

                // Check if all filled — short delay for UX
                if (inputs.every(inp => inp.value.length === 1)) {
                    setTimeout(() => {
                        const otpCode = inputs.map(inp => inp.value).join('');
                        elements.messageInput.value = otpCode;
                        container.remove();
                        elements.messageInput.style.display = 'block';
                        elements.sendBtn.style.display = 'flex';
                        handleSend();
                    }, 180);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    inputs[i - 1].value = '';
                    inputs[i - 1].classList.remove('filled');
                    inputs[i - 1].focus();
                }
            });

            // Paste support: fill all digits at once
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                pasted.split('').slice(0, 6).forEach((ch, idx) => {
                    if (inputs[idx]) {
                        inputs[idx].value = ch;
                        inputs[idx].classList.add('filled');
                    }
                });
                const nextEmpty = inputs.findIndex(inp => !inp.value);
                (nextEmpty >= 0 ? inputs[nextEmpty] : inputs[5]).focus();
                if (inputs.every(inp => inp.value.length === 1)) {
                    setTimeout(() => {
                        const otpCode = inputs.map(inp => inp.value).join('');
                        elements.messageInput.value = otpCode;
                        container.remove();
                        elements.messageInput.style.display = 'block';
                        elements.sendBtn.style.display = 'flex';
                        handleSend();
                    }, 180);
                }
            });
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-otp-btn';
        cancelBtn.textContent = 'Cancel Verification';
        cancelBtn.onclick = () => {
            elements.messageInput.value = 'cancel';
            container.remove();
            elements.messageInput.style.display = 'block';
            elements.sendBtn.style.display = 'flex';
            handleSend();
        };

        container.appendChild(inputsDiv);
        container.appendChild(cancelBtn);

        elements.messagesArea.appendChild(container);
        elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;

        // Hide normal input temporarily
        elements.messageInput.style.display = 'none';
        elements.sendBtn.style.display = 'none';

        // Focus first input
        setTimeout(() => inputs[0].focus(), 100);
    },

    updateFileState(state, fileName = '') {
        const preview = elements.filePreview;
        const nameSpan = preview.querySelector('.file-name');
        const removeBtn = elements.removeFileBtn;

        preview.className = 'file-preview'; // Reset classes

        if (state === 'uploading') {
            preview.classList.add('uploading');
            nameSpan.textContent = 'Uploading: ' + fileName + '...';
            preview.classList.remove('hidden');
            removeBtn.innerHTML = '<div class="upload-spinner"></div>';
            removeBtn.style.pointerEvents = 'none';
        } else if (state === 'success') {
            preview.classList.add('success');
            nameSpan.textContent = 'Processed Successfully';
            removeBtn.innerHTML = '✓';
            setTimeout(() => {
                UI.hideFilePreview();
                removeBtn.innerHTML = '&times;';
                removeBtn.style.pointerEvents = 'auto';
            }, 3000);
        } else if (state === 'error') {
            nameSpan.textContent = 'Upload Failed';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.pointerEvents = 'auto';
            setTimeout(() => UI.hideFilePreview(), 3000);
        }
    }
};

// ===================================
// API Interaction
// ===================================
async function apiCall(data, isGeneralQuery = false) {
    try {
        const isFormData = data instanceof FormData;

        const fetchOptions = {
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data)
        };

        // Don't set Content-Type for FormData, the browser will set it with the boundary
        if (!isFormData) {
            fetchOptions.headers = { 'Content-Type': 'application/json' };
        }

        const url = isGeneralQuery ? CONFIG.PYTHON_AGENT_URL : CONFIG.WEBHOOK_URL;
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response Error:', response.status, errorText);
            throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('API Response Data:', result);
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { error: true, output: "I'm having a bit of trouble connecting to my brain. Could you try again in a moment?" };
    }
}

async function apiCallStream(data, onChunk) {
    try {
        const fetchOptions = {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream' 
            }
        };

        const response = await fetch(CONFIG.PYTHON_AGENT_URL, fetchOptions);

        if (!response.ok) {
            let errorDetail = `Server returned ${response.status}`;
            try {
                const errorJson = await response.json();
                if (errorJson.detail) errorDetail += `: ${errorJson.detail}`;
            } catch (e) {
                // Fallback if not JSON or no detail
            }
            throw new Error(errorDetail);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace('data: ', '').trim();
                        if (jsonStr === '[DONE]') {
                            done = true;
                            break;
                        }
                        
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.text) {
                                onChunk(parsed.text);
                            } else if (parsed.error) {
                                console.error('Stream reported backend error:', parsed.error);
                                onChunk(` [Backend Error: ${parsed.error}]`);
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk:', e, jsonStr);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('API Stream Error:', error);
        onChunk(` [Stream Error: ${error.message}]`);
7    }
}

// ===================================
// Core Logic & Heuristics
// ===================================

// Analyzes AI response to trigger Insight Animation based on context
function triggerHeuristicInsight(aiResponse, previousInput) {
    const text = aiResponse.toLowerCase();
    const input = previousInput.toLowerCase();

    // Check if AI is acknowledging collected data or asking next question
    if (text.includes("name") && !state.capturedFields.has('name')) {
        UI.triggerInsightAnimation('name');
    } else if (text.includes("email") || input.includes("@")) {
        UI.triggerInsightAnimation('email');
    } else if (text.includes("phone") || text.includes("number")) {
        UI.triggerInsightAnimation('phone');
    } else if (text.includes("budget") || input.includes("$") || input.includes("k") || input.includes("m")) {
        UI.triggerInsightAnimation('budget');
    } else if (text.includes("timeline") || text.includes("months") || text.includes("weeks")) {
        UI.triggerInsightAnimation('timeline');
    } else if (text.includes("company") || text.includes("business")) {
        UI.triggerInsightAnimation('company');
    } else if (text.includes("idea") || text.includes("building") || text.includes("product")) {
        UI.triggerInsightAnimation('product_idea');
    } else if (text.includes("market") || text.includes("audience")) {
        UI.triggerInsightAnimation('market');
    } else if (text.includes("kpi") || text.includes("success") || text.includes("metric")) {
        UI.triggerInsightAnimation('kpi');
    } else if (text.includes("expectations") || text.includes("looking for")) {
        UI.triggerInsightAnimation('expectations');
    } else if (text.includes("stage") || text.includes("current phase")) {
        UI.triggerInsightAnimation('stage');
    } else if (text.includes("urgency") || text.includes("priority") || text.includes("how fast")) {
        UI.triggerInsightAnimation('urgency');
    }
}

// Parses AI response to show appropriate Custom UI elements
function parseResponseForUI(text) {
    // 1. Check for Quick Replies (Yes/No)
    if (text.includes("(yes/no)") ||
        (text.includes("Would you like to") && text.includes("continue") && text.includes("yes")) ||
        (text.includes("switch to this account"))) {
        UI.showQuickReplies([
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' }
        ]);
        return text.replace("(yes/no)", ""); // Clean up text if needed
    }

    // 2. Check for Quick Replies (Email/Phone)
    if (text.includes("phone number or email") || text.includes("email or phone")) {
        UI.showQuickReplies([
            { label: 'Email', value: 'email' },
            { label: 'Phone via SMS', value: 'phone' }
        ]);
        return text;
    }

    // 3. Check for OTP PIN Input
    if (text.includes("6-digit code") || text.includes("enter the code")) {
        UI.showOtpInput();
        return text;
    }

    return text;
}

async function handleSend() {
    const text = elements.messageInput.value.trim();
    const file = state.selectedFile;

    if ((!text && !file) || state.isProcessing) return;

    // 1. Update UI
    if (text) UI.addMessage(text, false);
    
    // --- DEBUG COMMAND TO TEST PIN UI ---
    if (text.toLowerCase() === 'test pin') {
        elements.messageInput.value = '';
        setTimeout(() => {
            UI.addMessage("Here is the premium 6-digit code UI for your testing:", true);
            UI.showOtpInput();
        }, 500);
        return;
    }
    // ------------------------------------

    if (file) UI.addMessage(`[File: ${file.name}]`, false);

    UI.clearQuickReplies(); // Clear old quick replies

    elements.messageInput.value = '';
    const currentFile = state.selectedFile; // Store to use in API call

    if (currentFile) {
        UI.updateFileState('uploading', currentFile.name);
    } else {
        UI.hideFilePreview();
    }

    UI.setLoading(true);

    // Smart Routing Logic - Centralized in Backend
    // Text-only queries go to Python Orchestrator (Streaming)
    // File uploads go directly to Lead Bot
    const isGeneralQuery = !currentFile;

    // 2. Prepare Data
    let payload;

    if (currentFile) {
        payload = new FormData();
        payload.append('chatInput', text || '');
        payload.append('sessionId', state.sessionId);
        payload.append('file', currentFile);
    } else {
        payload = {
            message: text,
            sessionId: state.sessionId
        };
    }

    // 3. API Calls
    let responseData = null;

    try {
        if (isGeneralQuery) {
            console.log('Dispatching request to General bot (Streaming).');
            // Remove loading instantly for stream
            UI.setLoading(false); 
            
            // Create an empty message bubble immediately
            const streamBubble = UI.addMessage("", true);
            const contentDiv = streamBubble.querySelector('.md-content');
            let accumulatedText = "";

            await apiCallStream(payload, (chunk) => {
                accumulatedText += chunk;
                // Dynamically update the markdown render as chunks arrive
                contentDiv.innerHTML = MarkdownRenderer.render(accumulatedText);
                // Keep scroll at bottom
                elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
            });
            
            // Once done, check if we need to show Quick Replies (fallback heuristic)
            parseResponseForUI(accumulatedText);
            
            // Exit early since we've fully rendered the stream organically
            return;
            
        } else {
            console.log('Dispatching request to Lead bot only.');
            responseData = await apiCall(payload, false);
        }
    } catch (error) {
        console.error("Error during api calls", error);
        responseData = { error: true, output: "I'm having a bit of trouble connecting to my brain. Could you try again in a moment?" };
    }


    // 4. Process Response
    UI.setLoading(false);

    // Function to handle rendering a single AI response
    const renderResponse = (data, isGeneral = false) => {
        if (!data) return;
        
        console.log(`Processing response for ${isGeneral ? 'general' : 'lead'} bot:`, data);

        // Extract main message 
        let aiText = data.output || data.response || data.text;

        if (!aiText && data.error) {
            aiText = data.output; // The error message from apiCall fallback
        } else if (!aiText) {
            aiText = "I received a response, but couldn't find any text to display. Check the console.";
        }

        // Add message bubble FIRST, then show interactive elements below it
        UI.addMessage(aiText, true);

        // Process AI text for custom UI elements (appended after the bubble)
        parseResponseForUI(aiText);

        // Trigger Insight Animations via Heuristics for Lead Bot
        if (!isGeneral) {
            triggerHeuristicInsight(aiText, text);
            // Keeping this just in case n8n structure changes later
            const extracted = data.lead_qualification || data.metadata || data.extracted_data || {};
            Object.keys(extracted).forEach(field => {
                if (CONFIG.QUALIFICATION_FIELDS.includes(field) && extracted[field]) {
                    UI.triggerInsightAnimation(field);
                }
            });
        }
    };

    // Handle File Success visually
    if (currentFile && !isGeneralQuery) {
        let leadText = responseData?.output || responseData?.response || responseData?.text || "";
        if (leadText.includes("Thanks for sharing") || leadText.includes("securely linked")) {
            UI.updateFileState('success');
        } else {
            UI.updateFileState('error'); // Fallback if upload failed silently
        }
    }

    // Render response
    renderResponse(responseData, isGeneralQuery);
}

// ===================================
// Gesture & Motion Controller
// ===================================
const GestureController = {
    init() {
        this.initMagneticButtons();
    },

    initSwipe(messageEl, wrapperEl) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        const onStart = (e) => {
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            isDragging = true;
            wrapperEl.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            currentX = x - startX;

            // Limit swipe to left direction
            if (currentX < 0) {
                const pull = Math.max(currentX, -80);
                wrapperEl.style.transform = `translateX(${pull}px)`;
                messageEl.classList.toggle('swiped', pull < -40);
            }
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            wrapperEl.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0, 1)';
            wrapperEl.style.transform = 'translateX(0)';
            setTimeout(() => messageEl.classList.remove('swiped'), 300);
        };

        messageEl.addEventListener('touchstart', onStart, { passive: true });
        messageEl.addEventListener('touchmove', onMove, { passive: true });
        messageEl.addEventListener('touchend', onEnd);

        messageEl.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
    },

    initMagneticButtons() {
        const btns = document.querySelectorAll('.magnetic-btn');
        btns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distX = e.clientX - centerX;
                const distY = e.clientY - centerY;

                // Pull element 30% toward cursor
                btn.style.transform = `translate(${distX * 0.3}px, ${distY * 0.3}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0, 0)';
            });
        });
    }
};

// ===================================
// Real-Time Voice-to-Text (Speech API)
// ===================================
const VoiceService = {
    recognition: null,
    isListening: false,

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser.');
            elements.micBtn.style.display = 'none';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Stop automatically when user pauses
        this.recognition.interimResults = true; // Show words as they are spoken
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            elements.micBtn.classList.add('recording');
            elements.messageInput.placeholder = 'Listening...';
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Update input field in real-time
            if (finalTranscript) {
                elements.messageInput.value = finalTranscript;
            } else if (interimTranscript) {
                elements.messageInput.value = interimTranscript;
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            elements.micBtn.classList.remove('recording');
            elements.messageInput.placeholder = "Tell us what you're building…";
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stop();
        };
    },

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    },

    start() {
        if (!this.recognition) this.init();
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    },

    stop() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }
};

// ===================================
// Initialization
// ===================================
// ===================================
// Interactive Particle System
// ===================================
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.init();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        this.particles = [];
        const count = Math.floor(window.innerWidth / 15);
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
        this.ctx.fillStyle = color || '#6366f1';

        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            this.ctx.beginPath();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        requestAnimationFrame(() => this.animate());
    }
}

function init() {
    // Start Particle Systems
    new ParticleSystem('particle-canvas');
    new ParticleSystem('particle-canvas-chat');
    GestureController.init();
    VoiceService.init();

    // Event Listeners
    elements.continueBtn.addEventListener('click', UI.transitionToChat);
    elements.sendBtn.addEventListener('click', handleSend);
    elements.micBtn.addEventListener('click', () => VoiceService.toggle());
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // File Upload Listeners
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());

    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            UI.showFilePreview(e.target.files[0]);
        }
    });

    elements.removeFileBtn.addEventListener('click', () => {
        UI.hideFilePreview();
    });

    // Handle initial state
    elements.openingScreen.classList.add('active');

    console.log('Adra Assistant v2 Initialized');
    console.log('Session ID:', state.sessionId);
}

// ===================================
// Smart Localization: Time & Location
// ===================================
const TimeService = {
    // Primary city-to-timezone mapping
    tzMap: {
        'chennai': 'Asia/Kolkata',
        'mumbai': 'Asia/Kolkata',
        'delhi': 'Asia/Kolkata',
        'bangalore': 'Asia/Kolkata',
        'kolkata': 'Asia/Kolkata',
        'london': 'Europe/London',
        'paris': 'Europe/Paris',
        'berlin': 'Europe/Berlin',
        'madrid': 'Europe/Madrid',
        'rome': 'Europe/Rome',
        'amsterdam': 'Europe/Amsterdam',
        'tokyo': 'Asia/Tokyo',
        'seoul': 'Asia/Seoul',
        'beijing': 'Asia/Shanghai',
        'shanghai': 'Asia/Shanghai',
        'hong kong': 'Asia/Hong_Kong',
        'hongkong': 'Asia/Hong_Kong',
        'singapore': 'Asia/Singapore',
        'dubai': 'Asia/Dubai',
        'bangkok': 'Asia/Bangkok',
        'new york': 'America/New_York',
        'nyc': 'America/New_York',
        'los angeles': 'America/Los_Angeles',
        'chicago': 'America/Chicago',
        'toronto': 'America/Toronto',
        'vancouver': 'America/Vancouver',
        'sydney': 'Australia/Sydney',
        'melbourne': 'Australia/Melbourne',
        'india': 'Asia/Kolkata',
        'usa': 'America/New_York',
        'uk': 'Europe/London',
        'germany': 'Europe/Berlin',
        'france': 'Europe/Paris',
        'japan': 'Asia/Tokyo',
        'china': 'Asia/Shanghai',
        'australia': 'Australia/Sydney',
        'canada': 'America/Toronto'
    },

    detectLocation(text) {
        if (!text) return null;
        const lowerText = text.toLowerCase();
        for (const [key, tz] of Object.entries(this.tzMap)) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(lowerText)) {
                return {
                    name: key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    tz
                };
            }
        }
        return null;
    },

    getLocalizedTime(timezone) {
        try {
            return new Intl.DateTimeFormat([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: timezone
            }).format(new Date());
        } catch (e) {
            return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    },

    detectTimeResponse(text) {
        if (!text) return null;

        // Must contain a time-related keyword to avoid false positives on weather temp matches
        const hasTimeKeyword = /\b(time|clock|currently|it is|it's)\b/i.test(text);
        if (!hasTimeKeyword) return null;

        // Match formats like:
        // "is 09:41 PM PST"
        // "is 2026-03-13 09:41:00 PM UTC"
        // "is 1:09 PM"
        // "time is 13:45"
        const timeMatch = text.match(/(?:is|time:?)\s+(?:\d{4}-\d{2}-\d{2}\s+)?(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?\s*([A-Z]{2,5})?/i);
        const locationMatch = text.match(/(?:in|for)\s+([A-Za-z][A-Za-z\s]+?)(?:\s*,\s*[A-Za-z]+)?\s+(?:is|time)/i);

        if (timeMatch) {
            let displayTime = timeMatch[1];
            // Strip seconds if present (HH:MM:SS -> HH:MM)
            displayTime = displayTime.replace(/:\d{2}$/, '');
            return {
                time: displayTime,
                period: timeMatch[2] || '',
                timezone: timeMatch[3] || 'LOCAL',
                location: locationMatch ? locationMatch[1].trim() : 'Local Time'
            };
        }
        return null;
    },

    createCard(data) {
        const card = document.createElement('div');
        card.className = 'time-card';

        card.innerHTML = `
            <div class="time-badge">${data.timezone}</div>
            <div class="time-location">${data.location}</div>
            <div class="time-display">
                ${data.time}<span class="time-period">${data.period}</span>
            </div>
            <div class="time-bg-map">🌐</div>
        `;
        return card;
    }
};

// ===================================
// Premium Data Visualization: Weather
// ===================================
const WeatherService = {
    parse(text) {
        if (!text) return null;

        // Advanced Heuristic Parsing for Weather Tools
        const tempMatch = text.match(/(-?\d+\.?\d*)\s*°[Cc]/);
        const humidityMatch = text.match(/Humidity:\s*(\d+)%/i);

        // Find location - usually "in [City] is"
        const locationMatch = text.match(/in\s+([^is]+)\s+is/i);

        // Find specific condition phrases
        let condition = 'Clear';
        if (text.includes('clear sky')) condition = 'Clear Sky';
        else if (text.includes('cloud')) condition = 'Cloudy';
        else if (text.includes('rain')) condition = 'Raining';
        else if (text.includes('storm')) condition = 'Stormy';
        else {
            const condMatch = text.match(/with\s+([^.]+)\./i);
            if (condMatch) condition = condMatch[1].trim();
        }

        if (tempMatch) {
            return {
                temp: Math.round(parseFloat(tempMatch[1])),
                condition: condition,
                humidity: humidityMatch ? humidityMatch[1] : '45',
                location: locationMatch ? locationMatch[1].trim() : 'Live Location'
            };
        }
        return null;
    },

    createCard(data) {
        const condition = data.condition.toLowerCase();
        let conditionType = 'clear';
        let icon = '☀️';

        if (condition.includes('rain') || condition.includes('drizzle')) {
            conditionType = 'rain';
            icon = '🌧️';
        } else if (condition.includes('cloud') || condition.includes('overcast')) {
            conditionType = 'clouds';
            icon = '☁️';
        }

        const card = document.createElement('div');
        card.className = 'weather-card';
        card.setAttribute('data-condition', conditionType);

        card.innerHTML = `
            <div class="weather-header">
                <div>
                    <div class="weather-condition-tag">LIVE · ${data.location.toUpperCase()}</div>
                    <div class="weather-temp-main">${data.temp}°</div>
                </div>
                <div style="font-size: 3rem; filter: drop-shadow(0 0 20px rgba(255,255,255,0.2));">${icon}</div>
            </div>
            <div class="weather-details-grid">
                <div class="weather-detail-item">
                    <span class="weather-detail-label">Status</span>
                    <span class="weather-detail-value">${data.condition}</span>
                </div>
                <div class="weather-detail-item">
                    <span class="weather-detail-label">Humidity</span>
                    <span class="weather-detail-value">${data.humidity}%</span>
                </div>
            </div>
            <div class="weather-icon-float">${icon}</div>
        `;
        return card;
    }
};

const LinkService = {
    linkify(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s<"]+)/g;
        return text.replace(urlRegex, (url) => {
            const cleanUrl = url.replace(/[.,!?;:]$/, '');
            const trailing = url.slice(cleanUrl.length);
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailing}`;
        });
    }
};

// ===================================
// Lightweight Markdown Renderer
// ===================================
const MarkdownRenderer = {
    render(text) {
        if (!text) return '';
        let html = text;

        // Escape raw HTML to prevent XSS
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Headers: ## Heading
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

        // Bold: **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic: *text* (but not list items)
        html = html.replace(/(?<!^\s*)\*([^*\n]+)\*/gm, '<em>$1</em>');

        // Unordered lists: * item or - item
        html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`);

        // Numbered lists: 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => {
            if (match.includes('<ul>')) return match;
            return `<ol>${match}</ol>`;
        });

        // Clickable URLs
        html = html.replace(/(https?:\/\/[^\s<"']+)/g, (url) => {
            const cleanUrl = url.replace(/[.,!?;:]$/, '');
            const trailing = url.slice(cleanUrl.length);
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailing}`;
        });

        // Line breaks (but not inside lists)
        html = html.replace(/\n(?!<\/?(ul|ol|li|h[2-4]))/g, '<br>');

        return html;
    }
};

document.addEventListener('DOMContentLoaded', init);
