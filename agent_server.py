import os
import sys
import asyncio
import ast
import operator
from datetime import datetime
import pytz
import wikipedia
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from dotenv import load_dotenv
import json
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import site
import io

# Ensure user-level site-packages are in path for Pypdf etc.
sys.path.append(site.getusersitepackages())

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent
from langchain.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves index.html at the url = "http://localhost:8000/chat"
@app.get("/")
async def get_index():
    return FileResponse(os.path.join(os.path.dirname(__file__), "index.html"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# -------- LLM CONFIGURATION --------
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY or "your_google_api_key_here" in GOOGLE_API_KEY:
    print("\n" + "="*70)
    print("FATAL ERROR: GOOGLE_API_KEY placeholder detected or missing from .env")
    print("Please follow these steps:")
    print("1. Open the .env file in the current directory.")
    print("2. Replace 'your_google_api_key_here' with a valid Gemini API key.")
    print("3. Restart the server.")
    print("="*70 + "\n")
    sys.exit(1)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    google_api_key=GOOGLE_API_KEY,
    temperature=0
)

# -------- TOOLS --------
search = TavilySearch(max_results=3)

# Initialize Dynamic Timezone Services (Senior Developer Approach)
tf = TimezoneFinder()
geolocator = Nominatim(user_agent="adra_assistant")

@tool
def calculator(expression: str) -> str:
    """Evaluate a math expression. Example: '25 * 34'"""
    ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.Mod: operator.mod,
    }
    def _eval(node):
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.BinOp):
            return ops[type(node.op)](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -_eval(node.operand)
        raise ValueError(f"Unsupported: {node}")
    try:
        return str(_eval(ast.parse(expression, mode='eval').body))
    except Exception as e:
        return f"Calculator error: {str(e)}"

@tool
def get_world_time(city: str) -> str:
    """Get the current time in ANY city or country. Example: 'London', 'Chennai', 'Paris'"""
    try:
        # 1. Geocode the city name to coordinates
        location = geolocator.geocode(city, timeout=10)
        if not location:
            return f"Sorry, I could not find the geographical location for '{city}'. Please check the spelling."
        
        # 2. Find the timezone from coordinates
        timezone_str = tf.timezone_at(lng=location.longitude, lat=location.latitude)
        if not timezone_str:
            return f"Sorry, I found '{city}' but could not determine its timezone."
            
        # 3. Get current time in that timezone
        tz = pytz.timezone(timezone_str)
        local_time = datetime.now(tz).strftime('%Y-%m-%d %I:%M:%S %p %Z')
        
        return f"The current time in {location.address} is {local_time}"
    except Exception as e:
        return f"Dynamic Time Error for {city}: {str(e)}"

@tool
def wikipedia_search(query: str) -> str:
    """Search Wikipedia for facts about any topic, person, company, or invention. Always returns a source URL."""
    try:
        page = wikipedia.page(query, auto_suggest=True)
        summary = ". ".join(page.summary.split(". ")[:3])
        return f"{summary}\n\nSource: {page.url}"
    except wikipedia.exceptions.DisambiguationError as e:
        try:
            page = wikipedia.page(e.options[0], auto_suggest=False)
            summary = ". ".join(page.summary.split(". ")[:3])
            return f"{summary}\n\nSource: {page.url}"
        except Exception:
            return f"Multiple results: {', '.join(e.options[:5])}"
    except wikipedia.exceptions.PageError:
        return f"No Wikipedia page found for '{query}'."
    except Exception as e:
        return f"Wikipedia error: {str(e)}"

def clean_response(response) -> str:
    if isinstance(response, str):
        return response
    if isinstance(response, list):
        parts = []
        for block in response:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return " ".join(parts) if parts else "No response."
    return str(response)

# Global agent variable
agent_executor = None

async def init_agent():
    global agent_executor
    client = MultiServerMCPClient({
        "weather": {
            "command": sys.executable,
            "args": [os.path.join(BASE_DIR, "weather_server.py")],
            "transport": "stdio",
            "env": dict(os.environ),
            "cwd": BASE_DIR,
        },
        "stock": {
            "command": sys.executable,
            "args": [os.path.join(BASE_DIR, "stock_server.py")],
            "transport": "stdio",
            "env": dict(os.environ),
            "cwd": BASE_DIR,
        }
    })

    mcp_tools = await client.get_tools()
    all_tools = mcp_tools + [search, calculator, get_world_time, wikipedia_search]

    agent_executor = create_react_agent(
        llm,
        all_tools,
        prompt="""You are the Adra AI, a professional and precise digital assistant. 
        
CRITICAL REQUIREMENT:
1. You MUST NEVER answer factual questions from memory. Use a tool for EVERY informational query.
2. For EVERY search-based response (Wikipedia, Tavily, etc.), you MUST explicitly include the "Source: [URL]" at the end of your message.
3. DO NOT rephrase or omit the URL found in the tool output. It is vital for user verification.
4. If you use multiple sources, list them all.

Format for factual replies:
[Clean, concise answer from tool]
Source: [URL from tool]

Tool usage rules:
- get_stock_price(symbol)  \u2192 for ANY stock questions.
- get_weather(location)    \u2192 for weather questions.
- get_world_time(city)     \u2192 for time questions.
- calculator(expression)   \u2192 for math.
- wikipedia_search(query)  \u2192 for biographical, historical, or company facts.
- tavily_search(query)     \u2192 for news and general web searches.
"""
    )

class ChatRequest(BaseModel):
    message: str
    sessionId: str

@app.on_event("startup")
async def startup_event():
    await init_agent()

# Session memory for intent stickiness
session_flows = {} # sessionId -> last_intent

# Classification LLM setup
classification_llm = llm.with_config({"temperature": 0})

def get_intent_prompt(message: str, last_intent: str = "NONE") -> str:
    context_note = ""
    if last_intent == "LEAD":
        context_note = "IMPORTANT: The user is answering questions in a LEAD (onboarding/sales) flow. Short answers like names or 'yes' should stay in 'LEAD' category."
    
    return f"""Analyze the user's message and categorize it into exactly ONE of two categories: 'LEAD' or 'GENERAL'.

{context_note}

CATEGORIES:
- 'LEAD': 
    1. Starting a new project/hiring/pricing questions.
    2. Responding to onboarding questions (name, email, project details).
    3. Brief follow-up info like "iam johnny" or "it is for my company".
- 'GENERAL': 
    1. Factual questions (weather, stocks, time, math, Wikipedia).
    2. Switching to a completely different non-business topic.

User Message: "{message}"
Previous Context: {last_intent}

Provide the response in this EXACT format:
REASONING: [Explain why]
CATEGORY: [LEAD or GENERAL]"""

async def forward_to_n8n(message: str, session_id: str):
    """Forward the request to the n8n Lead Bot webhook."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CONFIG_WEBHOOK_URL,
                json={"chatInput": message, "sessionId": session_id},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            # Handle standard n8n output formats
            return data.get("output") or data.get("response") or data.get("text") or "I received a lead response, but it was empty."
    except json.JSONDecodeError:
        print(f"Error decoding JSON from n8n. Status: {response.status_code}, Response text: {response.text}")
        snippet = response.text[:100] + "..." if len(response.text) > 100 else response.text
        return f"Invalid response from n8n (Status {response.status_code}). Response: {snippet}"
    except httpx.HTTPStatusError as e:
        print(f"HTTP Error from n8n: {e.response.status_code} - {e.response.text}")
        return f"The lead system returned an error (Status {e.response.status_code})."
    except Exception as e:
        print(f"Unexpected error communicating with n8n: {e}")
        return f"I'm having trouble reaching the lead system. Error: {str(e)}"

# Define URL from environment variable
CONFIG_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "https://vinod4.app.n8n.cloud/webhook/chatbot")

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"--- Incoming Request (Smart Orchestrator) ---")
    print(f"Message: {request.message}")
    print(f"Session: {request.sessionId}")
    
    if not agent_executor:
        print("Error: Agent not initialized!")
        raise HTTPException(status_code=500, detail="Agent not initialized")
    
    async def generate():
        try:
            # 1. Intent Classification
            last_intent = session_flows.get(request.sessionId, "NONE")
            print(f"--- Classification Debug ---")
            print(f"Session: {request.sessionId}")
            print(f"Last Intent recorded: {last_intent}")
            
            classification_resp = await classification_llm.ainvoke(get_intent_prompt(request.message, last_intent))
            raw_classification = classification_resp.content
            print(f"LLM Classification Output:\n{raw_classification}")
            
            is_lead = "CATEGORY: LEAD" in raw_classification.upper()
            print(f"Final Decided Intent: {'LEAD' if is_lead else 'GENERAL'}")
            print(f"---------------------------")
            
            # Update session flow stickiness
            session_flows[request.sessionId] = "LEAD" if is_lead else "GENERAL"

            if is_lead:
                # 2a. Handle Lead Logic (Non-streaming n8n call)
                print("Action: Forwarding to n8n Lead Webhook")
                n8n_response = await forward_to_n8n(request.message, request.sessionId)
                yield f"data: {json.dumps({'text': n8n_response})}\n\n"
            else:
                # 2b. Handle Factual Logic (Streaming LangGraph Agent)
                print("Action: Invoking LangGraph Streaming Agent")
                async for event in agent_executor.astream_events(
                    {"messages": [{"role": "user", "content": request.message}]},
                    version="v2"
                ):
                    if event["event"] == "on_chat_model_stream":
                        chunk = event["data"]["chunk"]
                        if hasattr(chunk, "content") and chunk.content:
                            content = chunk.content
                            if isinstance(content, str):
                                yield f"data: {json.dumps({'text': content})}\n\n"
                            elif isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict) and block.get("type") == "text":
                                        yield f"data: {json.dumps({'text': block['text']})}\n\n"
                                    elif isinstance(block, str):
                                        yield f"data: {json.dumps({'text': block})}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"CRITICAL ERROR in orchestrator: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/expert-insights")
async def get_expert_insights(request: dict):
    """Provide professional AI analysis with high tolerance for data variants."""
    print(f"DEBUG: Received Insight Request: {request}")
    
    idea = request.get("idea") or "No idea provided"
    budget = request.get("budget") or "No budget provided"
    context = request.get("context") or {}

    system_prompt = """You are the 'Adra Expert', a high-level digital product strategist for Adra AI agency. 
Your goal is to provide a candid, professional, and strategic evaluation of a potential client's project idea relative to their budget.

CONTENT GUIDELINES:
1. TONALITY: Professional, insightful, and slightly bold. You are an authority in Tech & ROI.
2. FEASIBILITY: Be honest. If a complex app (like a Social Network or Marketplace) has a tiny budget (e.g. < $5k), explain the 'Budget Gap' and suggest an MVP (Minimum Viable Product).
3. STRATEGY: Offer 1-2 practical next steps (e.g., 'Focus on core feature X first' or 'Consider No-Code for v1').
4. FORMAT: Use brief paragraphs. Keep it under 150 words.
5. NO FLUFF: Start directly with the analysis. Use bold text for emphasis.

Input Idea: {idea}
Input Budget: {budget}
Additional Context: {context}

Response strictly as the Adra Expert:"""

    try:
        prompt = system_prompt.format(
            idea=idea, 
            budget=budget, 
            context=json.dumps(context)
        )
        
        response = await llm.ainvoke(prompt)
        return {"insight": response.content}
    except Exception as e:
        print(f"Expert Insight Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/deepgram-token")
async def deepgram_token():
    """Return the Deepgram API key for browser-based STT connections."""
    api_key = os.getenv("DEEPGRAM_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY not configured in .env")

    return {"key": api_key}

async def extract_text_from_pdf(url: str):
    """Download and extract text from a PDF URL using httpx."""
    if not url:
        return "[Error: URL is empty]"
    
    url = url.replace('\n', '').replace('\r', '').strip()
    
    try:
        from pypdf import PdfReader
    except ImportError:
        print("CRITICAL: pypdf not found in this environment.")
        return "[System Error: PDF library not installed on server]"

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            
            # Read PDF from bytes
            pdf_file = io.BytesIO(response.content)
            reader = PdfReader(pdf_file)
            
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            
            return text if text.strip() else "[No readable text found in this PDF]"
    except Exception as e:
        print(f"PDF Extraction Error: {e}")
        return f"[Error reading PDF: {str(e)}]"

@app.post("/analyze-document")
async def analyze_document(request: dict):
    """A specialized endpoint for deep-diving into a single PDF document."""
    file_url = request.get("url")
    file_name = request.get("name", "Document")
    
    if not file_url:
        raise HTTPException(status_code=400, detail="Missing file URL")

    print(f"Action: AI Document Analysis on {file_name}")
    
    # 1. Extract Text
    content = await extract_text_from_pdf(file_url)
    
    # 2. AI Prompt
    prompt = f"""You are the 'Adra Elite AI Analyst', a high-level digital product strategist for Adra AI agency. 
Your task is to provide a technical and strategic evaluation of the provided project document.

DOCUMENT NAME: {file_name}
DOCUMENT CONTENT:
---
{content[:8000]}
---

ANALYSIS GUIDELINES:
1. **STRATEGIC OVERVIEW**: What is the core business value of this project? (Be concise and bold).
2. **TECHNICAL VIABILITY**: Based on these requirements, is this feasible with modern AI/Web standards? Mention 1-2 complexity risks.
3. **FEASIBILITY & ROI**: Evaluate if the project seems like a high-impact investment or a high-maintenance experiment.
4. **ELITE VERDICT**: Give a final professional 'Go/No-Go' recommendation on if this document is ready for development or needs more clarity.

TONE: Candid, professional, and authoritative. Start directly with the analysis. Use bold text for emphasis.
"""

    try:
        response = await llm.ainvoke(prompt)
        return {"analysis": response.content}
    except Exception as e:
        print(f"Document Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_config():
    return {
        "version": "1.1-insights",
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
        "ADMIN_AI_WEBHOOK_URL": os.getenv("ADMIN_AI_WEBHOOK_URL")
    }

# Serves all other static files (css, js, images) from the current folder
app.mount("/", StaticFiles(directory=os.path.dirname(__file__)), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
