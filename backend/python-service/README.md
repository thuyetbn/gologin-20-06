# Browser-Use Service

AI-powered browser automation service for GoLogin Manager using [browser-use](https://github.com/browser-use/browser-use).

## Setup

### 1. Install Python Dependencies

```bash
cd backend/python-service

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### 2. Configure Environment Variables

Edit `.env` in project root:

```env
# LLM API Keys
# Google Gemini is FREE! Get your key at: https://aistudio.google.com/apikey
GOOGLE_API_KEY=your-google-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key  # Optional, paid

# Browser-Use Service Settings
BROWSER_USE_HOST=127.0.0.1
BROWSER_USE_PORT=8765
BROWSER_USE_PYTHON_PATH=/path/to/python  # or venv/Scripts/python on Windows
BROWSER_USE_DEFAULT_LLM=google  # google (free!) or anthropic
BROWSER_USE_LOG_LEVEL=info
```

### Available LLM Models

| Provider | Model | Cost | Notes |
|----------|-------|------|-------|
| **Google** | gemini-2.0-flash-exp | 🆓 FREE | Fast, recommended for most tasks |
| **Google** | gemini-1.5-flash | 🆓 FREE | Fast & reliable |
| **Google** | gemini-1.5-flash-8b | 🆓 FREE | Lightweight |
| **Google** | gemini-1.5-pro | 🆓 FREE tier | Most capable |
| Anthropic | claude-3-5-sonnet | 💰 Paid | Best reasoning |

**Recommendation**: Use Google Gemini - it's completely FREE!

### 3. Run Service Manually (for testing)

```bash
cd backend/python-service
python server.py
```

Service will start at `http://127.0.0.1:8765`

## API Endpoints

### Health Check
```
GET /health
```

### Service Status
```
GET /status
```

### Run Task
```
POST /task
{
  "profile_id": "abc123",
  "cdp_url": "ws://127.0.0.1:9222/devtools/browser/...",
  "task": "Go to google.com and search for 'browser automation'",
  "llm_provider": "google",
  "max_steps": 50,
  "use_vision": true
}
```

### Connect Agent (Persistent)
```
POST /connect
{
  "profile_id": "abc123",
  "cdp_url": "ws://127.0.0.1:9222/devtools/browser/...",
  "llm_provider": "google"
}
```

### Disconnect Agent
```
POST /disconnect/{profile_id}
```

## Usage from Electron

```typescript
// Start service
await window.api.invoke('browser-use:start');

// Run a task on a running profile (using FREE Google Gemini)
const result = await window.api.invoke('browser-use:run-task', {
  profileId: 'profile-123',
  cdpUrl: 'ws://127.0.0.1:9222/devtools/browser/...',
  task: 'Go to amazon.com and search for "laptop"',
  llmProvider: 'google',  // FREE!
  model: 'gemini-2.0-flash-exp',
  maxSteps: 30
});

console.log(result);
// { success: true, result: "Found 50 results for laptop", steps: [...] }
```

## Example Tasks

```typescript
// Simple navigation
"Go to https://example.com"

// Search
"Go to google.com and search for 'AI automation'"

// Form filling
"Go to the login page and enter username 'test@example.com' and password 'secret123'"

// Data extraction
"Go to https://news.ycombinator.com and extract the top 5 article titles"

// Complex workflow
"Go to amazon.com, search for 'wireless mouse', filter by 4+ stars, and add the first result to cart"
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              GoLogin Manager (Electron)              │
│                                                      │
│  1. Launch profile → Get CDP URL (wsUrl)            │
│  2. Call browser-use:run-task with CDP URL          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────┐
│           Browser-Use Service (Python)               │
│                                                      │
│  3. Connect to Orbita browser via CDP               │
│  4. LLM analyzes task → generates actions           │
│  5. Playwright executes actions                     │
│  6. Return results                                  │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Service won't start
- Check Python path in `.env`
- Ensure all dependencies are installed
- Check port 8765 is not in use

### Connection failed
- Ensure GoLogin profile is running
- Verify CDP URL is correct (from profile launch response)
- Check firewall settings

### Task execution errors
- Verify API key is valid
- Check LLM provider is correctly set
- Increase max_steps for complex tasks
