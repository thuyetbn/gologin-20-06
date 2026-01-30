"""Browser-Use Agent wrapper for GoLogin profiles - Updated for browser-use 0.9.x"""
import asyncio
from typing import Optional, Any
from browser_use import Agent, Browser
from browser_use.llm.base import BaseChatModel
from config import config


# Available Google Gemini models (all FREE!)
GOOGLE_MODELS = {
    'gemini-2.0-flash-exp': 'Gemini 2.0 Flash (Experimental) - Fast & Free',
    'gemini-1.5-flash': 'Gemini 1.5 Flash - Fast & Free', 
    'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B - Lightweight & Free',
    'gemini-1.5-pro': 'Gemini 1.5 Pro - Most capable (Free tier available)',
}

DEFAULT_GOOGLE_MODEL = 'gemini-2.0-flash-exp'


class BrowserUseLLM(BaseChatModel):
    """
    Wrapper to make langchain LLMs compatible with browser-use 0.9.x
    Must have 'provider' attribute for browser-use Agent
    """
    
    def __init__(self, llm: Any, provider_name: str, model_name: str):
        self._llm = llm
        self._provider = provider_name
        self._model_name = model_name
    
    @property
    def provider(self) -> str:
        return self._provider
    
    @property
    def model_name(self) -> str:
        return self._model_name
    
    @property
    def name(self) -> str:
        return f"{self._provider}/{self._model_name}"
    
    async def ainvoke(self, messages, **kwargs):
        """Async invoke the underlying LLM"""
        return await self._llm.ainvoke(messages, **kwargs)
    
    def __getattr__(self, name):
        """Forward other attributes to underlying LLM"""
        if name.startswith('_'):
            raise AttributeError(name)
        return getattr(self._llm, name)


class GoLoginBrowserAgent:
    """
    Browser-Use agent that connects to existing GoLogin/Orbita browser instances
    via Chrome DevTools Protocol (CDP)
    """
    
    def __init__(
        self,
        cdp_url: str,
        llm_provider: str = None,
        model: str = None
    ):
        self.cdp_url = cdp_url
        self.llm_provider = llm_provider or config.DEFAULT_LLM
        self.model = model
        self.browser: Optional[Browser] = None
        
    def _create_llm(self) -> BrowserUseLLM:
        """Create LLM instance wrapped for browser-use compatibility"""
        if self.llm_provider == 'anthropic':
            from langchain_anthropic import ChatAnthropic
            model_name = self.model or 'claude-3-5-sonnet-20241022'
            llm = ChatAnthropic(
                model=model_name,
                api_key=config.ANTHROPIC_API_KEY,
                timeout=60,
                temperature=0
            )
            return BrowserUseLLM(llm, 'anthropic', model_name)
        else:  # default to google (FREE!)
            from langchain_google_genai import ChatGoogleGenerativeAI
            model_name = self.model or DEFAULT_GOOGLE_MODEL
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=config.GOOGLE_API_KEY,
                temperature=0,
                convert_system_message_to_human=True,
            )
            return BrowserUseLLM(llm, 'google', model_name)
    
    async def connect(self) -> bool:
        """Connect to existing GoLogin browser via CDP"""
        try:
            self.browser = Browser(
                cdp_url=self.cdp_url,
                headless=False,
                disable_security=True,
            )
            return True
        except Exception as e:
            print(f"Failed to connect to browser: {e}")
            return False
    
    async def run_task(
        self,
        task: str,
        max_steps: int = 50,
        use_vision: bool = True
    ) -> dict:
        """Execute a task using Browser-Use agent"""
        if not self.browser:
            connected = await self.connect()
            if not connected:
                return {
                    'success': False,
                    'error': 'Failed to connect to browser',
                    'result': None,
                    'steps': []
                }
        
        try:
            llm = self._create_llm()
            
            agent = Agent(
                task=task,
                llm=llm,
                browser=self.browser,
                use_vision=use_vision,
            )
            
            result = await agent.run(max_steps=max_steps)
            
            # Extract result
            final_result = None
            steps = []
            
            if result:
                if hasattr(result, 'final_result'):
                    fr = result.final_result
                    final_result = fr() if callable(fr) else fr
                elif hasattr(result, 'result'):
                    final_result = result.result
                elif isinstance(result, str):
                    final_result = result
                    
                if hasattr(result, 'history'):
                    history = result.history() if callable(result.history) else result.history
                    steps = [str(action) for action in (history or [])]
                elif hasattr(result, 'actions'):
                    steps = [str(action) for action in (result.actions or [])]
            
            return {
                'success': True,
                'result': str(final_result) if final_result else 'Task completed',
                'steps': steps,
                'error': None
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'result': None,
                'steps': []
            }
    
    async def close(self):
        """Close browser connection"""
        if self.browser:
            try:
                if hasattr(self.browser, 'stop'):
                    await self.browser.stop()
                elif hasattr(self.browser, 'close'):
                    await self.browser.close()
            except Exception as e:
                print(f"Error closing browser: {e}")
            self.browser = None


async def run_task_on_profile(
    cdp_url: str,
    task: str,
    llm_provider: str = None,
    max_steps: int = 50
) -> dict:
    """Run a single task on a GoLogin profile"""
    agent = GoLoginBrowserAgent(cdp_url, llm_provider)
    try:
        return await agent.run_task(task, max_steps)
    finally:
        await agent.close()
