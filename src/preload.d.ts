import { Api } from "../backend/preload";

declare global {
  interface Window {
    api: Api;
    electronAPI: Api; // Alias for compatibility
  }
}
