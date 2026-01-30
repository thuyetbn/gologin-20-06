"""FastAPI server for Browser-Use integration with GoLogin Manager"""
import asyncio
import json
import logging
import sys
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from browser_agent import GoLoginBrowserAgent, run_task_on_profile
from config import config

# Fix Unicode logging on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper()),
    format='%(levelname)-5s [%(name)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Store active agents by profile ID
active_agents: dict[str, GoLoginBrowserAgent] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info(f"Browser-Use service starting on {config.HOST}:{config.PORT}")
    yield
    # Cleanup on shutdown
    for profile_id, agent in active_agents.items():
        logger.info(f"Closing agent for profile {profile_id}")
        await agent.close()
    active_agents.clear()


app = FastAPI(
    title="Browser-Use Service",
    description="AI-powered browser automation for GoLogin Manager",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class TaskRequest(BaseModel):
    profile_id: str
    cdp_url: str
    task: str
    llm_provider: Optional[str] = None
    model: Optional[str] = None
    max_steps: int = 50
    use_vision: bool = True


class TaskResponse(BaseModel):
    success: bool
    result: Optional[str] = None
    steps: list[str] = []
    error: Optional[str] = None


class ConnectRequest(BaseModel):
    profile_id: str
    cdp_url: str
    llm_provider: Optional[str] = None
    model: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    active_profiles: list[str]
    version: str = "1.0.0"


# REST Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "browser-use"}


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Get service status and active profiles"""
    return StatusResponse(
        status="running",
        active_profiles=list(active_agents.keys())
    )


@app.post("/connect")
async def connect_to_profile(request: ConnectRequest):
    """Connect Browser-Use agent to a running GoLogin profile"""
    if request.profile_id in active_agents:
        return {"success": True, "message": "Already connected"}
    
    agent = GoLoginBrowserAgent(
        cdp_url=request.cdp_url,
        llm_provider=request.llm_provider,
        model=request.model
    )
    
    connected = await agent.connect()
    if connected:
        active_agents[request.profile_id] = agent
        return {"success": True, "message": "Connected successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to connect to browser")


@app.post("/disconnect/{profile_id}")
async def disconnect_profile(profile_id: str):
    """Disconnect agent from a profile"""
    if profile_id not in active_agents:
        raise HTTPException(status_code=404, detail="Profile not connected")
    
    agent = active_agents.pop(profile_id)
    await agent.close()
    return {"success": True, "message": "Disconnected"}


@app.post("/task", response_model=TaskResponse)
async def run_task(request: TaskRequest):
    """Run a task on a GoLogin profile (one-shot or persistent)"""
    logger.info(f"Running task on profile {request.profile_id}: {request.task[:50]}...")
    logger.info(f"CDP URL: {request.cdp_url}")
    logger.info(f"LLM Provider: {request.llm_provider}")
    
    try:
        # Check if we have a persistent agent
        if request.profile_id in active_agents:
            agent = active_agents[request.profile_id]
            result = await agent.run_task(
                task=request.task,
                max_steps=request.max_steps,
                use_vision=request.use_vision
            )
        else:
            # One-shot execution
            result = await run_task_on_profile(
                cdp_url=request.cdp_url,
                task=request.task,
                llm_provider=request.llm_provider,
                max_steps=request.max_steps
            )
    except Exception as e:
        logger.error(f"Task execution error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
    return TaskResponse(**result)


# WebSocket for real-time task streaming
@app.websocket("/ws/{profile_id}")
async def websocket_endpoint(websocket: WebSocket, profile_id: str):
    """WebSocket endpoint for real-time task execution updates"""
    await websocket.accept()
    logger.info(f"WebSocket connected for profile {profile_id}")
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "task":
                cdp_url = message.get("cdp_url")
                task = message.get("task")
                
                if not cdp_url or not task:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Missing cdp_url or task"
                    })
                    continue
                
                # Send start notification
                await websocket.send_json({
                    "type": "started",
                    "task": task
                })
                
                # Run task
                result = await run_task_on_profile(
                    cdp_url=cdp_url,
                    task=task,
                    llm_provider=message.get("llm_provider"),
                    max_steps=message.get("max_steps", 50)
                )
                
                # Send result
                await websocket.send_json({
                    "type": "completed",
                    **result
                })
                
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for profile {profile_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
        log_level=config.LOG_LEVEL
    )
