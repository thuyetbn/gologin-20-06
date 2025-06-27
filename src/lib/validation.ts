export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateField = (value: string, rules: ValidationRule): ValidationResult => {
  // Required validation
  if (rules.required && (!value || value.trim().length === 0)) {
    return { isValid: false, error: 'This field is required' };
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim().length === 0) {
    return { isValid: true };
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return { 
      isValid: false, 
      error: `Must be at least ${rules.minLength} characters long` 
    };
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return { 
      isValid: false, 
      error: `Must be no more than ${rules.maxLength} characters long` 
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return { isValid: false, error: 'Invalid format' };
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return { isValid: false, error: customError };
    }
  }

  return { isValid: true };
};

// Pre-defined validation rules
export const validationRules = {
  profileName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_\.]+$/,
    custom: (value: string) => {
      if (value.trim() !== value) {
        return 'Profile name cannot start or end with spaces';
      }
      return null;
    }
  } as ValidationRule,

  groupName: {
    required: true,
    minLength: 1,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
    custom: (value: string) => {
      if (value.trim() !== value) {
        return 'Group name cannot start or end with spaces';
      }
      return null;
    }
  } as ValidationRule,

  proxyName: {
    required: true,
    minLength: 1,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9\s\-_\.]+$/
  } as ValidationRule,

  proxyHost: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z0-9\.\-]+$/,
    custom: (value: string) => {
      // Basic hostname validation
      if (value.includes('..') || value.startsWith('.') || value.endsWith('.')) {
        return 'Invalid hostname format';
      }
      return null;
    }
  } as ValidationRule,

  proxyPort: {
    required: true,
    pattern: /^\d+$/,
    custom: (value: string) => {
      const port = parseInt(value);
      if (port < 1 || port > 65535) {
        return 'Port must be between 1 and 65535';
      }
      return null;
    }
  } as ValidationRule,

  gologinToken: {
    required: true,
    minLength: 10,
    pattern: /^[A-Za-z0-9\.\-_]+$/,
    custom: (value: string) => {
      if (!value.includes('.')) {
        return 'Invalid token format (should be JWT)';
      }
      return null;
    }
  } as ValidationRule,

  filePath: {
    required: true,
    minLength: 1,
    custom: (value: string) => {
      // Basic path validation
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(value)) {
        return 'Path contains invalid characters';
      }
      return null;
    }
  } as ValidationRule
};

// Form validation helper
export const validateForm = (formData: Record<string, string>, rules: Record<string, ValidationRule>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = formData[field] || '';
    const result = validateField(value, fieldRules);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
};

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const sanitizeFileName = (input: string): string => {
  return input.replace(/[<>:"|?*]/g, '').trim();
};

export const sanitizePath = (input: string): string => {
  // Remove potentially dangerous path traversal patterns
  return input.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '').trim();
}; 