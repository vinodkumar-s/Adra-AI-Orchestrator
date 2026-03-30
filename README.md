# Adra AI Orchestrator 🚀

Adra is a premium, high-performance AI assistant platform that orchestrates between general-purpose AI (LangGraph/Gemini) and complex business-specific automated workflows (n8n).

![Adra Landing Page](assets/landing_page.png)
*Welcome to Adra Product Studio.*

## ✨ Key Features & Capabilities

Adra is more than just a chatbot; it's a unified intelligence layer for your business.

- **Unified Assistant**: Routes requests between a factual AI layer (Gemini Pro) and deep lead qualification workflows.
- **WhatsApp & Web Multi-Channel**: Fully integrated with WhatsApp (via n8n/Twilio) for asynchronous lead capture.
- **Intelligent Lead Qualification**: Automatically analyzes and scores project ideas, budgets, and timelines using LLM-based extraction.
- **Internal AI Analyst ("Adra Intelligence")**: A dedicated dashboard agent that helps admins search leads, score risks, and identify high-priority deals.
- **Automated Document Processing**: Seamlessly handles file uploads (PDFs/Images) and extracts structured data for your CRM.
- **Premium Real-time Dashboard**: A sleek, dark-mode metrics center for monitoring lead conversion and pipeline health.
- **Voice-Enabled Interface**: Built-in speech recognition for a natural, hands-free user experience.

## 🛠️ Tech Stack & Security

- **Backend**: Python 3.10+, FastAPI, LangChain, LangGraph, Google Gemini AI.
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3 (Glassmorphism), HTML5.
- **Automation**: n8n (Orchestration & Integration).
- **Database**: Supabase / PostgreSQL.
- **Security**: Hardened architecture with dynamic server-side configuration using a secure `/config` endpoint.

---

## ⚡ Recent Evolution & Improvements

We recently upgraded the platform with several critical enhancements:

- **n8n Subdomain Migration**: Successfully transitioned to the `vinod2` account for improved reliability and faster execution.
- **Security Hardening**: Completely removed hardcoded API keys and secrets from the frontend. All sensitive data is now managed via server-side `.env` files.
- **Dynamic Configuration**: Implemented a secure backend-to-frontend configuration bridge to prevent secret leakage in public repositories.
- **Production Readiness**: Initialized a clean GitHub repository with professional documentation and protection against secret leaks.

---

## 📸 Project Gallery

### 1. n8n Orchestration Workflow
The heart of the automation, handling everything from WhatsApp media to complex lead qualification logic.
![n8n Workflow](assets/n8n_flow.png)

### 2. Admin Dashboard Overview
Real-time tracking of all leads, conversion metrics, and engagement status.
![Dashboard Overview](assets/admin_dashboard_1.png)

### 3. Lead Management & Filters
Powerful sorting and filtering tools to manage a growing pipeline of clients.
![Lead Table](assets/admin_dashboard_2.png)

### 4. Deep Client Insights
Rich, structured details for every lead, including project ideas, budgets, and timelines.
![Client Details](assets/client_details.png)

### 5. Adra Intelligence (AI Analyst)
Your internal assistant for analyzing data and managing risks directly within the dashboard.
![AI Analyst](assets/ai_analyst.png)

### 6. Unified Assistant Interface
The sleek, glassmorphism-inspired chat interface for end-users.
![Chat Interface](assets/chat_interface.png)

### 7. WhatsApp Conversational Lead Capture
A professional, automated consultant that engages users, collects contact info, and processes project proposals.
![WhatsApp Chat](assets/whatsapp_chat.png)

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/vinodkumar-s/Adra-AI-Orchestrator.git
cd Adra-AI-Orchestrator
pip install -r requirements.txt
```

### 2. Environment Setup
Create a `.env` file with the following keys:
- `GOOGLE_API_KEY`
- `TAVILY_API_KEY`
- `N8N_WEBHOOK_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_AI_WEBHOOK_URL`

### 3. Run
```bash
python agent_server.py
```

---

