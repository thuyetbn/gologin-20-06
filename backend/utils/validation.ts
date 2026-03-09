import * as yup from 'yup';

// ── Reusable field schemas ──

const profileId = yup.string().required('Profile ID is required').min(1);
const nonEmptyString = (field: string) => yup.string().required(`${field} is required`).min(1);

// ── General Handlers ──

export const proxiesSetSchema = yup.array().of(
  yup.object({
    id: yup.string().required(),
    name: yup.string().required(),
    host: yup.string().required(),
    port: yup.number().required().min(1).max(65535),
    type: yup.string().oneOf(['http', 'https', 'socks4', 'socks5', 'ssh']).required(),
    username: yup.string().optional().default(''),
    password: yup.string().optional().default(''),
  }).noUnknown(false)
).required('Proxies must be an array');

export const groupCreateSchema = yup.object({
  Name: yup.string().required('Group name is required').max(30, 'Group name must be 30 characters or less'),
  Description: yup.string().optional().max(200, 'Description must be 200 characters or less'),
  Sort: yup.number().optional(),
  CreatedBy: yup.number().optional(),
});

export const groupUpdateSchema = yup.object({
  Id: yup.number().required('Group ID is required'),
  Name: yup.string().optional().max(30, 'Group name must be 30 characters or less'),
  Description: yup.string().optional().max(200, 'Description must be 200 characters or less'),
  Sort: yup.number().optional(),
});

export const groupDeleteSchema = yup.number().required('Group ID is required');

export const tokenAddSchema = yup.object({
  name: nonEmptyString('Token name').max(100),
  token: nonEmptyString('Token value').min(10, 'Token must be at least 10 characters'),
});

export const tokenUpdateSchema = yup.object({
  index: yup.number().required('Token index is required').min(0),
  name: nonEmptyString('Token name').max(100),
  token: nonEmptyString('Token value').min(10, 'Token must be at least 10 characters'),
});

export const tokenDeleteSchema = yup.number().required('Token index is required').min(0);

export const settingsSetSchema = yup.object({
  dataPath: yup.string().required('Data path is required'),
  theme: yup.string().oneOf(['light', 'dark', 'system']).optional(),
  language: yup.string().optional(),
  autoStart: yup.boolean().optional(),
  minimizeToTray: yup.boolean().optional(),
  checkUpdates: yup.boolean().optional(),
  logLevel: yup.string().oneOf(['error', 'warn', 'info', 'debug']).optional(),
  maxProfiles: yup.number().optional().min(1),
  defaultProxy: yup.string().optional(),
  backupEnabled: yup.boolean().optional(),
  backupInterval: yup.number().optional().min(1),
  gologinToken: yup.string().optional(),
}).noUnknown(false);

export const shellOpenPathSchema = yup.string()
  .required('Path is required')
  .min(1)
  .test('no-command-injection', 'Path contains invalid characters', (value) => {
    if (!value) return false;
    // Block command injection but allow parentheses (common in Windows paths like Program Files (x86))
    const dangerous = /[;&|`${}[\]<>!]/.test(value);
    return !dangerous;
  });

export const dataSetupSchema = yup.string()
  .required('Data path is required')
  .min(1)
  .test('no-traversal', 'Path must not contain directory traversal (..)', (value) => {
    if (!value) return false;
    return !value.includes('..');
  })
  .test('absolute-path', 'Path must be absolute', (value) => {
    if (!value) return false;
    // Windows drive letter (C:\), UNC path (\\), or Unix absolute (/)
    return /^([a-zA-Z]:[/\\]|\/|\\\\)/.test(value);
  });

// ── Profile Handlers ──

export const profileIdSchema = profileId;

export const profileCreateSchema = yup.object({
  Name: yup.string().required('Profile name is required').trim().min(1).max(50, 'Profile name must be 50 characters or less'),
  GroupId: yup.number().optional().nullable(),
  os: yup.string().oneOf(['win', 'mac', 'lin', 'android']).optional(),
  osSpec: yup.string().optional(),
  navigator: yup.object({
    userAgent: yup.string().optional(),
    resolution: yup.string().optional(),
    language: yup.string().optional(),
    platform: yup.string().optional(),
    hardwareConcurrency: yup.number().optional().min(1).max(128),
    deviceMemory: yup.number().optional(),
  }).optional().default(undefined),
  JsonData: yup.string().optional(),
});

export const profileUpdateSchema = yup.object({
  Id: nonEmptyString('Profile ID'),
  Name: yup.string().optional().max(50),
  GroupId: yup.number().optional().nullable(),
  JsonData: yup.string().optional(),
  S3Path: yup.string().optional().nullable(),
}).noUnknown(false);

export const importCookieSchema = yup.object({
  profileId: nonEmptyString('Profile ID'),
  rawCookies: yup.mixed().required('Cookies data is required'),
});

// ── Cookie Handlers ──

export const cookieFileSchema = yup.object({
  profileId: nonEmptyString('Profile ID'),
  filePath: nonEmptyString('File path'),
});

export const batchExportSchema = yup.array()
  .of(yup.string().required())
  .required('Profile IDs array is required')
  .min(1, 'At least one profile ID is required');

export const batchImportSchema = yup.array()
  .of(yup.object({
    profileId: nonEmptyString('Profile ID'),
    cookies: yup.array().required(),
  }))
  .required('Import data is required')
  .min(1, 'At least one import entry is required');

// ── Validate helper ──

/**
 * Validates input against a yup schema. Throws a user-friendly Error on failure.
 */
export async function validate<T>(schema: yup.Schema<T>, data: unknown): Promise<T> {
  try {
    return await schema.validate(data, { abortEarly: false, stripUnknown: false });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const messages = err.errors.join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw err;
  }
}
