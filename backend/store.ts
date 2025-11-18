import * as Store from "electron-store";
import { Settings } from "./interfaces";

const defaults: Settings = {
  dataPath: "",
};

const store = new (Store as any).default({
  defaults,
});

export default store; 