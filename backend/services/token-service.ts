/**
 * Token Service - Manage GoLogin tokens stored in token.json
 */
import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import store from '../store';

export interface GoLoginToken {
  name: string;
  token: string;
}

interface TokenData {
  tokens: GoLoginToken[];
  currentIndex: number;
}

const DEFAULT_TOKENS: GoLoginToken[] = [];

class TokenService {
  private tokenFilePath: string;
  private tokens: GoLoginToken[] = [];
  private currentIndex: number = 0;
  private initialized: boolean = false;

  constructor() {
    // Token file will be in data directory or app userData
    this.tokenFilePath = '';
  }

  private getTokenFilePath(): string {
    const dataPath = store.get('dataPath') as string;
    const basePath = dataPath || app.getPath('userData');
    return join(basePath, 'token.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.tokenFilePath = this.getTokenFilePath();
    await this.loadTokens();
    this.initialized = true;
  }

  private async loadTokens(): Promise<void> {
    try {
      this.tokenFilePath = this.getTokenFilePath();
      const data = await fs.readFile(this.tokenFilePath, 'utf-8');
      const parsed: TokenData = JSON.parse(data);
      this.tokens = parsed.tokens || [];
      this.currentIndex = parsed.currentIndex || 0;
      
      // Validate currentIndex
      if (this.currentIndex >= this.tokens.length) {
        this.currentIndex = 0;
      }
      
      console.log(`✅ Loaded ${this.tokens.length} GoLogin tokens`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create with defaults
        console.log('📝 Creating new token.json file');
        this.tokens = DEFAULT_TOKENS;
        this.currentIndex = 0;
        await this.saveTokens();
      } else {
        console.error('❌ Error loading tokens:', error);
        this.tokens = DEFAULT_TOKENS;
        this.currentIndex = 0;
      }
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      this.tokenFilePath = this.getTokenFilePath();
      const data: TokenData = {
        tokens: this.tokens,
        currentIndex: this.currentIndex
      };
      await fs.writeFile(this.tokenFilePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 Saved ${this.tokens.length} tokens to ${this.tokenFilePath}`);
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Get all tokens
   */
  async getTokens(): Promise<GoLoginToken[]> {
    await this.initialize();
    return [...this.tokens];
  }

  /**
   * Add a new token
   */
  async addToken(name: string, token: string): Promise<GoLoginToken[]> {
    await this.initialize();
    
    // Check for duplicate token
    if (this.tokens.some(t => t.token === token)) {
      throw new Error('Token already exists');
    }
    
    this.tokens.push({ name, token });
    await this.saveTokens();
    return [...this.tokens];
  }

  /**
   * Update a token
   */
  async updateToken(index: number, name: string, token: string): Promise<GoLoginToken[]> {
    await this.initialize();
    
    if (index < 0 || index >= this.tokens.length) {
      throw new Error('Invalid token index');
    }
    
    // Check for duplicate token (excluding current)
    if (this.tokens.some((t, i) => i !== index && t.token === token)) {
      throw new Error('Token already exists');
    }
    
    this.tokens[index] = { name, token };
    await this.saveTokens();
    return [...this.tokens];
  }

  /**
   * Delete a token
   */
  async deleteToken(index: number): Promise<GoLoginToken[]> {
    await this.initialize();
    
    if (index < 0 || index >= this.tokens.length) {
      throw new Error('Invalid token index');
    }
    
    this.tokens.splice(index, 1);
    
    // Adjust currentIndex if needed
    if (this.currentIndex >= this.tokens.length) {
      this.currentIndex = Math.max(0, this.tokens.length - 1);
    }
    
    await this.saveTokens();
    return [...this.tokens];
  }

  /**
   * Get current token for API calls
   */
  async getCurrentToken(): Promise<string | null> {
    await this.initialize();
    
    if (this.tokens.length === 0) {
      return null;
    }
    
    return this.tokens[this.currentIndex].token;
  }

  /**
   * Rotate to next token
   */
  async rotateToNextToken(): Promise<string | null> {
    await this.initialize();
    
    if (this.tokens.length === 0) {
      return null;
    }
    
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    console.log(`🔄 Rotating to token ${this.currentIndex + 1}/${this.tokens.length}: ${this.tokens[this.currentIndex].name}`);
    await this.saveTokens();
    return this.tokens[this.currentIndex].token;
  }

  /**
   * Reset to first token
   */
  async resetTokenRotation(): Promise<void> {
    await this.initialize();
    this.currentIndex = 0;
    await this.saveTokens();
  }

  /**
   * Get token count
   */
  async getTokenCount(): Promise<number> {
    await this.initialize();
    return this.tokens.length;
  }

  /**
   * Reload tokens from file (useful after dataPath change)
   */
  async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}

// Singleton instance
export const tokenService = new TokenService();
