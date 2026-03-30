// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Webhook URL from n8n
    WEBHOOK_URL: 'https://vinodkumars001.app.n8n.cloud/webhook/b3b0a7fe-5eef-4449-b480-7ef11c51ae63/chat',

    // Field mapping for lead qualification (matches n8n tool parameters)
    FIELDS: [
        'name', 'email', 'company', 'product_idea',
        'budget', 'timeline', 'market', 'kpi',
        'expectations', 'stage', 'urgency'
    ]
};

// ===================================
// State Management
// ===================================
const state = {
    clientId: null,
    qualificationData: {},
    completedFields: 0,
    constellationStars: []
};

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
    constellationCanvas: document.getElementById('constellation-canvas')
};

// ===================================
// Constellation Animation System
// ===================================
class ConstellationBuilder {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.connections = [];
        this.animationFrame = null;

        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Start with center star
        this.addCenterStar();
        this.animate();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    addCenterStar() {
        const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;

        this.stars.push({
            x: centerX,
            y: centerY,
            radius: 4,
            opacity: 1,
            pulsePhase: 0,
            isCenter: true
        });
    }

    addStar() {
        if (this.stars.length >= 12) return; // Max 12 stars (1 center + 11 fields)

        const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;

        // Position stars in a circular pattern around center
        const angle = (this.stars.length - 1) * (Math.PI * 2 / 11);
        const radius = 70;

        const newStar = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            radius: 0,
            opacity: 0,
            pulsePhase: Math.random() * Math.PI * 2,
            targetRadius: 3,
            isCenter: false
        };

        this.stars.push(newStar);

        // Add connection to center star
        this.connections.push({
            from: 0,
            to: this.stars.length - 1,
            opacity: 0
        });

        // Trigger celebration animation
        this.celebrateStar(newStar);
    }

    celebrateStar(star) {
        // Particle burst effect
        const particles = [];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            particles.push({
                x: star.x,
                y: star.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1
            });
        }

        const animateParticles = () => {
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
            });

            if (particles[0].life > 0) {
                requestAnimationFrame(animateParticles);
            }
        };

        animateParticles();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.connections.forEach(conn => {
            const from = this.stars[conn.from];
            const to = this.stars[conn.to];

            if (conn.opacity < 1) {
                conn.opacity += 0.02;
            }

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.strokeStyle = `rgba(99, 102, 241, ${conn.opacity * 0.4})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });

        // Draw stars
        this.stars.forEach(star => {
            // Animate star appearance
            if (star.radius < star.targetRadius) {
                star.radius += 0.1;
            }
            if (star.opacity < 1) {
                star.opacity += 0.02;
            }

            // Pulse animation
            star.pulsePhase += 0.05;
            const pulse = Math.sin(star.pulsePhase) * 0.3 + 1;
            const currentRadius = star.radius * pulse;

            // Draw glow
            const gradient = this.ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, currentRadius * 4
            );
            gradient.addColorStop(0, `rgba(167, 139, 250, ${star.opacity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(99, 102, 241, ${star.opacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, currentRadius * 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw star core
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, currentRadius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

let constellation = null;

// ===================================
// Client ID Management
// ===================================
function generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getOrCreateClientId() {
    let clientId = localStorage.getItem('adra_client_id');

    if (!clientId) {
        clientId = generateClientId();
        localStorage.setItem('adra_client_id', clientId);
        console.log('New client ID created:', clientId);
    } else {
        console.log('Existing client ID loaded:', clientId);
    }

    return clientId;
}

// ===================================
// View Transitions
// ===================================
function transitionToChat() {
    elements.openingScreen.classList.remove('active');

    setTimeout(() => {
        elements.chatScreen.classList.add('active');
        elements.messageInput.focus();

        // Initialize constellation
        if (elements.constellationCanvas && !constellation) {
            constellation = new ConstellationBuilder(elements.constellationCanvas);
        }
    }, 500);
}

// ===================================
// Message Handling
// ===================================
function addMessage(text, isAI = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAI ? 'ai-message' : 'user-message'}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble glass-card';

    const p = document.createElement('p');
    p.textContent = text;

    bubbleDiv.appendChild(p);
    messageDiv.appendChild(bubbleDiv);
    elements.messagesArea.appendChild(messageDiv);

    // Scroll to bottom
    elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
}

function showTypingIndicator() {
    elements.typingIndicator.classList.remove('hidden');
    elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
}

function hideTypingIndicator() {
    elements.typingIndicator.classList.add('hidden');
}

// ===================================
// Lead Qualification Updates
// ===================================
function updateQualificationField(fieldName, value) {
    if (!CONFIG.FIELDS.includes(fieldName)) {
        console.warn('Unknown field:', fieldName);
        return;
    }

    // Update state
    if (!state.qualificationData[fieldName]) {
        state.completedFields++;

        // Animate logo with glow effect
        const logo = document.getElementById('adra-logo');
        if (logo) {
            logo.classList.add('insight-captured');
            setTimeout(() => {
                logo.classList.remove('insight-captured');
            }, 600);
        }

        // Update insight counter
        const counter = document.getElementById('insight-count');
        if (counter) {
            counter.textContent = state.completedFields;

            // Animate counter
            counter.style.transform = 'scale(1.3)';
            counter.style.color = '#a78bfa';
            setTimeout(() => {
                counter.style.transform = 'scale(1)';
                counter.style.color = '';
            }, 300);
        }

        console.log(`✨ Field captured: ${fieldName} = ${value}`);
    }
    state.qualificationData[fieldName] = value;
}

// ===================================
// API Communication
// ===================================
async function sendMessageToWebhook(message) {
    try {
        console.log('📤 Sending message to webhook:', message);

        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: state.clientId,
                message: message,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Received response:', data);
        return data;
    } catch (error) {
        console.error('❌ Error sending message:', error);

        // Return mock response for demo purposes when webhook fails
        return {
            ai_response: "I'm sorry, but I'm having trouble connecting to the server right now. Could you please try again later?",
            lead_qualification: {}
        };
    }
}

async function handleSendMessage() {
    const message = elements.messageInput.value.trim();

    if (!message) return;

    // Add user message to UI
    addMessage(message, false);

    // Clear input
    elements.messageInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Send to webhook
    const response = await sendMessageToWebhook(message);

    // Simulate realistic response delay
    setTimeout(() => {
        hideTypingIndicator();

        console.log('Processing response:', response);

        // Handle different response formats flexibly
        let aiResponse = null;
        let leadQualification = null;

        // Check for different possible response structures
        if (response.output) {
            aiResponse = response.output;
        } else if (response.ai_response) {
            aiResponse = response.ai_response;
        } else if (response.response) {
            aiResponse = response.response;
        } else if (response.message) {
            aiResponse = response.message;
        } else if (response.text) {
            aiResponse = response.text;
        } else if (typeof response === 'string') {
            aiResponse = response;
        }

        // Check for lead qualification data
        // n8n AI Agents often return data in metadata or as part of the output
        if (response.lead_qualification) {
            leadQualification = response.lead_qualification;
        } else if (response.qualification) {
            leadQualification = response.qualification;
        } else if (response.fields) {
            leadQualification = response.fields;
        } else if (response.metadata) {
            leadQualification = response.metadata;
        }

        // Add AI response
        if (aiResponse) {
            addMessage(aiResponse, true);
        } else {
            console.warn('⚠️ No AI response found in:', response);
            addMessage("I'm here to help! Could you tell me more?", true);
        }

        // Update qualification fields
        if (leadQualification && typeof leadQualification === 'object') {
            Object.entries(leadQualification).forEach(([field, value]) => {
                if (value && value !== 'Not collected') {
                    updateQualificationField(field, value);
                }
            });
        }
    }, 1000 + Math.random() * 1000); // 1-2 second delay
}

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    // Continue button
    elements.continueBtn.addEventListener('click', transitionToChat);

    // Send button
    elements.sendBtn.addEventListener('click', handleSendMessage);

    // Enter key to send
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

// ===================================
// Initialization
// ===================================
function init() {
    // Get or create client ID
    state.clientId = getOrCreateClientId();

    // Initialize event listeners
    initializeEventListeners();

    // Show opening screen
    elements.openingScreen.classList.add('active');

    console.log('Adra AI Assistant initialized');
    console.log('Client ID:', state.clientId);
    console.log('🌟 Constellation Builder ready');

    // Check if webhook URL is configured
    if (CONFIG.WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
        console.warn('⚠️ Webhook URL not configured. Using mock responses for demo.');
        console.warn('Please update CONFIG.WEBHOOK_URL in app.js with your n8n webhook URL.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
