"""Configuration for Browser-Use service"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

class Config:
    # API Keys (Google is FREE!)
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    
    # Service Settings
    HOST = os.getenv('BROWSER_USE_HOST', '127.0.0.1')
    PORT = int(os.getenv('BROWSER_USE_PORT', '8765'))
    LOG_LEVEL = os.getenv('BROWSER_USE_LOG_LEVEL', 'info')
    
    # Default LLM Provider (google is FREE!)
    DEFAULT_LLM = os.getenv('BROWSER_USE_DEFAULT_LLM', 'google')
    
    @classmethod
    def get_llm_api_key(cls, provider: str = None) -> str:
        provider = provider or cls.DEFAULT_LLM
        keys = {
            'google': cls.GOOGLE_API_KEY,
            'anthropic': cls.ANTHROPIC_API_KEY,
        }
        return keys.get(provider, '')

config = Config()
