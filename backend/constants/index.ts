import { app } from "electron/main";
import { join } from "node:path";

export const PORT = 4444;
export const DEFAULT_DATABASE_PATH = join(app.getPath("userData"), "database.sqlite");