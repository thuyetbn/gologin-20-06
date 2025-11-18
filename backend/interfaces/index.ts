export interface Profile {
  Id: string;
  Name: string;
  ProfilePath?: string;
  JsonData?: string;
  GroupId?: number;
  CreatedAt: string;
  S3Path?: string;
  CreatedBy?: number;
  LastRunBy?: number;
  LastRunAt?: string;
  UpdatedAt?: string;
  Group?: Group; // For eager loading
}

export interface Group {
  Id: number;
  Name?: string;
  Sort?: number;
  CreatedBy?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Example of a response type for a create operation
export interface CreateProfileResponse {
  error: boolean;
  data: Profile | any; // 'any' can be used for error objects
}

export interface Settings {
  dataPath: string;
  theme?: "light" | "dark" | "system";
  language?: string;
  autoStart?: boolean;
  minimizeToTray?: boolean;
  checkUpdates?: boolean;
  logLevel?: "error" | "warn" | "info" | "debug";
  maxProfiles?: number;
  defaultProxy?: string;
  backupEnabled?: boolean;
  backupInterval?: number;
  gologinToken?: string;
}
