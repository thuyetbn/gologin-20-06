import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type Channels =
  | "settings:get"
  | "settings:set"
  | "dialog:open"
  | "dialog:selectFolder"
  // Group channels
  | "groups:get"
  | "groups:create"
  | "groups:update"
  | "groups:delete"
  // Proxy channels
  | "proxies:get"
  | "proxies:set"
  // Profile channels
  | "profiles:get"
  | "profiles:create"
  | "profiles:update"
  | "profiles:delete"
  | "profiles:launch"
  | "profiles:stop"
  | "profiles:getRunning"
  | "profiles:getAllBrowserStatuses"
  | "profiles:exportCookie"
  | "profiles:importCookie"
  | "profiles:exportCookieToFile"
  | "profiles:importCookieFromFile"
  | "profiles:getCookieStats"
  | "profiles:restartBrowser"
  | "profiles:getAll"
  // Browser Service channels
  | "browser:get-info"
  | "browser:update-with-progress"
  | "browser-status-changed"
  // Shell operations
  | "shell:open-path"
  // Database operations
  | "data:setupDatabase"
  | "database:test"
  // Credential Management channels
  | "credentials:store"
  | "credentials:get"
  | "credentials:list"
  | "credentials:update"
  | "credentials:delete"
  | "credentials:migrate-gologin"
  | "credentials:import"
  | "credentials:export"
  | "credentials:validate"
  | "credentials:status"
  | "credentials:clear"
  | "credentials:test"
  // Cookie Sync channels
  | "cookies:get-local-info"
  | "cookies:upload"
  | "cookies:download"
  | "cookies:sync"
  // Keep old ones for now, will be removed later
  | "get-users"
  | "delete-user"
  | "update-user";

export const api = {
  /**
   * Registers a callback function to be invoked when a message is received on the specified IPC channel.
   *
   * @param {Channels} channel - The name of the IPC channel to listen on.
   * @param {Function} callback - The callback function to be invoked when a message is received.
   *                             The callback function will receive two parameters: the event object and the message data.
   */
  on: (channel: Channels, callback: (event: IpcRendererEvent, args: unknown) => void) => {
    ipcRenderer.on(channel, (event: IpcRendererEvent, args: unknown) =>
      callback(event, args)
    );
  },

  /**
   * Sends a message through the IPC channel with the specified channel name and arguments.
   *
   * @param {Channels} channel - The name of the IPC channel to send the message through.
   * @param {any} args - The arguments to send along with the message.
   * @return {void} This function does not return anything.
   */
  send: (channel: Channels, args: unknown): void => {
    ipcRenderer.send(channel, args);
  },

  /**
   * Sends a synchronous message through the IPC channel with the specified channel name and arguments.
   *
   * @param {Channels} channel - The name of the IPC channel to send the message through.
   * @param {any} args - The arguments to send along with the message.
   * @return {any} The response from the main process.
   */
  sendSync: (channel: Channels, args: unknown): unknown => {
    return ipcRenderer.sendSync(channel, args);
  },

  /**
   * Sends a message to the main process and returns a Promise that is resolved with the response.
   *
   * @param {Channels} channel - The name of the IPC channel to send the message through.
   * @param {any} args - The arguments to send along with the message.
   * @return {Promise<any>} A Promise that resolves with the response from the main process.
   */
  invoke: (channel: Channels, args?: unknown): Promise<any> => {
    return ipcRenderer.invoke(channel, args);
  },

  /**
   * Removes all listeners for a specific channel.
   *
   * @param {Channels} channel - The name of the IPC channel to remove listeners from.
   */
  removeAllListeners: (channel: Channels): void => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld("api", api);

// Also expose as electronAPI for compatibility
contextBridge.exposeInMainWorld("electronAPI", api);

export type Api = typeof api;
