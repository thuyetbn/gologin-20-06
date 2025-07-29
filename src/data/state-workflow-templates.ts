// State-Aware Workflow Templates
// Pre-built non-linear workflow patterns inspired by finite automata

import { v4 as uuidv4 } from 'uuid';
import { NonLinearWorkflow, StateWorkflowTemplate } from '../types/state-workflow';

export const STATE_WORKFLOW_TEMPLATES: StateWorkflowTemplate[] = [
  {
    id: 'conditional-login',
    name: 'Conditional Login Flow',
    category: 'Authentication',
    description: 'Adaptive login flow that handles different authentication states (logged out, 2FA, captcha, etc.)',
    parameters: [
      { name: 'loginUrl', type: 'url', default: 'https://example.com/login', required: true, description: 'Login page URL' },
      { name: 'username', type: 'string', default: 'user@example.com', required: true, description: 'Username/Email' },
      { name: 'password', type: 'string', default: 'password123', required: true, description: 'Password' },
    ],
    workflow: {
      id: uuidv4(),
      name: 'Conditional Login Flow',
      description: 'Handles multiple authentication scenarios automatically',
      version: '1.0.0',
      initialState: 'start',
      config: {
        timeout: 30000,
        retries: 3,
        parallelism: 1,
        errorHandling: 'continue'
      },
      states: [
        {
          id: 'start',
          name: 'Start',
          type: 'start',
          description: 'Navigate to login page',
          conditions: [],
          actions: [
            {
              id: 'goto-login',
              action: 'goto',
              url: '{{loginUrl}}',
              timeout: 10000
            }
          ],
          transitions: [
            { id: 't1', from: 'start', to: 'check-auth-state' }
          ],
          position: { x: 100, y: 100 },
          data: { label: 'Start' }
        },
        {
          id: 'check-auth-state',
          name: 'Check Authentication State',
          type: 'condition',
          description: 'Determine current authentication state',
          conditions: [],
          actions: [],
          transitions: [
            {
              id: 't2-already-logged',
              from: 'check-auth-state',
              to: 'success',
              condition: {
                id: 'already-logged-in',
                type: 'url',
                operator: 'contains',
                target: '/dashboard'
              }
            },
            {
              id: 't2-login-form',
              from: 'check-auth-state',
              to: 'fill-credentials',
              condition: {
                id: 'login-form-exists',
                type: 'selector',
                operator: 'exists',
                target: '#login-form'
              }
            },
            {
              id: 't2-captcha',
              from: 'check-auth-state',
              to: 'handle-captcha',
              condition: {
                id: 'captcha-exists',
                type: 'selector',
                operator: 'exists',
                target: '.captcha'
              }
            },
            {
              id: 't2-error',
              from: 'check-auth-state',
              to: 'error',
              delay: 2000
            }
          ],
          position: { x: 300, y: 100 },
          data: { label: 'Check Auth State' }
        },
        {
          id: 'fill-credentials',
          name: 'Fill Login Credentials',
          type: 'action',
          description: 'Enter username and password',
          conditions: [],
          actions: [
            {
              id: 'fill-username',
              action: 'fill',
              selector: '#username',
              value: '{{username}}'
            },
            {
              id: 'fill-password',
              action: 'fill',
              selector: '#password',
              value: '{{password}}'
            },
            {
              id: 'click-login',
              action: 'click',
              selector: '#login-button'
            }
          ],
          transitions: [
            { id: 't3', from: 'fill-credentials', to: 'check-login-result', delay: 1000 }
          ],
          position: { x: 500, y: 200 },
          data: { label: 'Fill Credentials' }
        },
        {
          id: 'check-login-result',
          name: 'Check Login Result',
          type: 'condition',
          description: 'Evaluate login attempt outcome',
          conditions: [],
          actions: [],
          transitions: [
            {
              id: 't4-success',
              from: 'check-login-result',
              to: 'success',
              condition: {
                id: 'login-success',
                type: 'url',
                operator: 'contains',
                target: '/dashboard'
              }
            },
            {
              id: 't4-2fa',
              from: 'check-login-result',
              to: 'handle-2fa',
              condition: {
                id: '2fa-required',
                type: 'selector',
                operator: 'exists',
                target: '#two-factor-code'
              }
            },
            {
              id: 't4-error',
              from: 'check-login-result',
              to: 'handle-login-error',
              condition: {
                id: 'login-error',
                type: 'selector',
                operator: 'exists',
                target: '.error-message'
              }
            }
          ],
          position: { x: 700, y: 200 },
          data: { label: 'Check Result' }
        },
        {
          id: 'handle-2fa',
          name: 'Handle Two-Factor Authentication',
          type: 'action',
          description: 'Process 2FA challenge',
          conditions: [],
          actions: [
            {
              id: 'wait-2fa-input',
              action: 'wait',
              timeout: 30000
            },
            {
              id: 'screenshot-2fa',
              action: 'screenshot'
            }
          ],
          transitions: [
            { id: 't5', from: 'handle-2fa', to: 'success', delay: 5000 }
          ],
          position: { x: 900, y: 150 },
          data: { label: 'Handle 2FA' }
        },
        {
          id: 'handle-captcha',
          name: 'Handle CAPTCHA',
          type: 'action',
          description: 'Process CAPTCHA challenge',
          conditions: [],
          actions: [
            {
              id: 'screenshot-captcha',
              action: 'screenshot'
            },
            {
              id: 'wait-captcha-solve',
              action: 'wait',
              timeout: 60000
            }
          ],
          transitions: [
            { id: 't6', from: 'handle-captcha', to: 'fill-credentials' }
          ],
          position: { x: 300, y: 300 },
          data: { label: 'Handle CAPTCHA' }
        },
        {
          id: 'handle-login-error',
          name: 'Handle Login Error',
          type: 'action',
          description: 'Process login failure',
          conditions: [],
          actions: [
            {
              id: 'extract-error-message',
              action: 'extract',
              selector: '.error-message'
            },
            {
              id: 'screenshot-error',
              action: 'screenshot'
            }
          ],
          transitions: [
            { id: 't7', from: 'handle-login-error', to: 'error' }
          ],
          position: { x: 700, y: 350 },
          data: { label: 'Handle Error' }
        },
        {
          id: 'success',
          name: 'Login Successful',
          type: 'end',
          description: 'Successfully authenticated',
          conditions: [],
          actions: [
            {
              id: 'final-screenshot',
              action: 'screenshot'
            }
          ],
          transitions: [],
          position: { x: 1100, y: 100 },
          data: { label: 'Success' }
        },
        {
          id: 'error',
          name: 'Login Failed',
          type: 'error',
          description: 'Authentication failed',
          conditions: [],
          actions: [
            {
              id: 'error-screenshot',
              action: 'screenshot'
            }
          ],
          transitions: [],
          position: { x: 500, y: 400 },
          data: { label: 'Error' }
        }
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        tags: ['authentication', 'conditional', 'adaptive']
      }
    }
  },

  {
    id: 'parallel-data-extraction',
    name: 'Parallel Data Extraction',
    category: 'Data Processing',
    description: 'Extract data from multiple sources simultaneously with state synchronization',
    parameters: [
      { name: 'sourceUrls', type: 'string', default: 'https://site1.com,https://site2.com', required: true, description: 'Comma-separated URLs' }
    ],
    workflow: {
      id: uuidv4(),
      name: 'Parallel Data Extraction',
      description: 'Concurrent data extraction with synchronization points',
      version: '1.0.0',
      initialState: 'start',
      config: {
        timeout: 30000,
        retries: 2,
        parallelism: 3,
        errorHandling: 'continue'
      },
      states: [
        {
          id: 'start',
          name: 'Initialize Extraction',
          type: 'start',
          description: 'Setup parallel extraction process',
          conditions: [],
          actions: [
            {
              id: 'init-variables',
              action: 'evaluate',
              script: `
                window.extractionResults = {};
                window.completedSources = 0;
                window.totalSources = '{{sourceUrls}}'.split(',').length;
                return true;
              `
            }
          ],
          transitions: [
            { id: 't1', from: 'start', to: 'extract-source-1' },
            { id: 't2', from: 'start', to: 'extract-source-2' },
            { id: 't3', from: 'start', to: 'extract-source-3' }
          ],
          position: { x: 100, y: 200 },
          data: { label: 'Start' }
        },
        {
          id: 'extract-source-1',
          name: 'Extract from Source 1',
          type: 'parallel',
          description: 'Extract data from first source',
          conditions: [],
          actions: [
            {
              id: 'goto-source-1',
              action: 'goto',
              url: '{{sourceUrls}}'.split(',')[0]
            },
            {
              id: 'extract-data-1',
              action: 'extract',
              selector: 'h1'
            },
            {
              id: 'mark-complete-1',
              action: 'evaluate',
              script: 'window.completedSources++; window.extractionResults.source1 = arguments[0];'
            }
          ],
          transitions: [
            { id: 't4', from: 'extract-source-1', to: 'synchronize' }
          ],
          position: { x: 300, y: 100 },
          data: { label: 'Source 1' }
        },
        {
          id: 'extract-source-2',
          name: 'Extract from Source 2',
          type: 'parallel',
          description: 'Extract data from second source',
          conditions: [],
          actions: [
            {
              id: 'goto-source-2',
              action: 'goto',
              url: '{{sourceUrls}}'.split(',')[1] || 'about:blank'
            },
            {
              id: 'extract-data-2',
              action: 'extract',
              selector: 'h1'
            },
            {
              id: 'mark-complete-2',
              action: 'evaluate',
              script: 'window.completedSources++; window.extractionResults.source2 = arguments[0];'
            }
          ],
          transitions: [
            { id: 't5', from: 'extract-source-2', to: 'synchronize' }
          ],
          position: { x: 300, y: 200 },
          data: { label: 'Source 2' }
        },
        {
          id: 'extract-source-3',
          name: 'Extract from Source 3',
          type: 'parallel',
          description: 'Extract data from third source',
          conditions: [],
          actions: [
            {
              id: 'goto-source-3',
              action: 'goto',
              url: '{{sourceUrls}}'.split(',')[2] || 'about:blank'
            },
            {
              id: 'extract-data-3',
              action: 'extract',
              selector: 'h1'
            },
            {
              id: 'mark-complete-3',
              action: 'evaluate',
              script: 'window.completedSources++; window.extractionResults.source3 = arguments[0];'
            }
          ],
          transitions: [
            { id: 't6', from: 'extract-source-3', to: 'synchronize' }
          ],
          position: { x: 300, y: 300 },
          data: { label: 'Source 3' }
        },
        {
          id: 'synchronize',
          name: 'Synchronization Point',
          type: 'condition',
          description: 'Wait for all parallel tasks to complete',
          conditions: [
            {
              id: 'all-complete',
              type: 'custom',
              operator: 'equals',
              target: 'window.completedSources >= window.totalSources'
            }
          ],
          actions: [],
          transitions: [
            { id: 't7', from: 'synchronize', to: 'process-results' }
          ],
          position: { x: 500, y: 200 },
          data: { label: 'Sync Point' }
        },
        {
          id: 'process-results',
          name: 'Process Combined Results',
          type: 'action',
          description: 'Process all extracted data',
          conditions: [],
          actions: [
            {
              id: 'combine-results',
              action: 'evaluate',
              script: `
                const results = window.extractionResults;
                console.log('Combined Results:', results);
                return results;
              `
            },
            {
              id: 'final-screenshot',
              action: 'screenshot'
            }
          ],
          transitions: [
            { id: 't8', from: 'process-results', to: 'success' }
          ],
          position: { x: 700, y: 200 },
          data: { label: 'Process Results' }
        },
        {
          id: 'success',
          name: 'Extraction Complete',
          type: 'end',
          description: 'All data successfully extracted',
          conditions: [],
          actions: [],
          transitions: [],
          position: { x: 900, y: 200 },
          data: { label: 'Success' }
        }
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        tags: ['parallel', 'data-extraction', 'synchronization']
      }
    }
  },

  {
    id: 'adaptive-form-filling',
    name: 'Adaptive Form Filling',
    category: 'Form Processing',
    description: 'Intelligently fill forms with different layouts and validation states',
    parameters: [
      { name: 'formUrl', type: 'url', default: 'https://example.com/contact', required: true, description: 'Form URL' },
      { name: 'formData', type: 'string', default: '{"name":"John Doe","email":"john@example.com"}', required: true, description: 'JSON form data' }
    ],
    workflow: {
      id: uuidv4(),
      name: 'Adaptive Form Filling',
      description: 'Handles various form layouts and validation scenarios',
      version: '1.0.0',
      initialState: 'start',
      config: {
        timeout: 15000,
        retries: 2,
        parallelism: 1,
        errorHandling: 'retry'
      },
      states: [
        {
          id: 'start',
          name: 'Navigate to Form',
          type: 'start',
          description: 'Load the target form page',
          conditions: [],
          actions: [
            {
              id: 'goto-form',
              action: 'goto',
              url: '{{formUrl}}'
            }
          ],
          transitions: [
            { id: 't1', from: 'start', to: 'detect-form-type' }
          ],
          position: { x: 100, y: 200 },
          data: { label: 'Start' }
        },
        {
          id: 'detect-form-type',
          name: 'Detect Form Type',
          type: 'condition',
          description: 'Identify form layout and structure',
          conditions: [],
          actions: [],
          transitions: [
            {
              id: 't2-multi-step',
              from: 'detect-form-type',
              to: 'fill-step-1',
              condition: {
                id: 'multi-step-form',
                type: 'selector',
                operator: 'exists',
                target: '.step-indicator'
              }
            },
            {
              id: 't2-single-page',
              from: 'detect-form-type',
              to: 'fill-single-form',
              condition: {
                id: 'single-page-form',
                type: 'selector',
                operator: 'exists',
                target: 'form'
              }
            },
            {
              id: 't2-modal',
              from: 'detect-form-type',
              to: 'handle-modal-form',
              condition: {
                id: 'modal-form',
                type: 'selector',
                operator: 'exists',
                target: '.modal form'
              }
            }
          ],
          position: { x: 300, y: 200 },
          data: { label: 'Detect Type' }
        },
        {
          id: 'fill-single-form',
          name: 'Fill Single Page Form',
          type: 'action',
          description: 'Fill all fields in single form',
          conditions: [],
          actions: [
            {
              id: 'fill-all-fields',
              action: 'evaluate',
              script: `
                const data = JSON.parse('{{formData}}');
                for (const [key, value] of Object.entries(data)) {
                  const field = document.querySelector(\`[name="\${key}"], #\${key}\`);
                  if (field) field.value = value;
                }
                return true;
              `
            }
          ],
          transitions: [
            { id: 't3', from: 'fill-single-form', to: 'validate-and-submit' }
          ],
          position: { x: 500, y: 150 },
          data: { label: 'Fill Single Form' }
        },
        {
          id: 'fill-step-1',
          name: 'Fill Form Step 1',
          type: 'action',
          description: 'Fill first step of multi-step form',
          conditions: [],
          actions: [
            {
              id: 'fill-step-1-fields',
              action: 'evaluate',
              script: `
                const data = JSON.parse('{{formData}}');
                // Fill visible fields only
                const visibleFields = document.querySelectorAll('input:not([type="hidden"]):not([style*="display: none"])');
                let fieldIndex = 0;
                for (const [key, value] of Object.entries(data)) {
                  if (fieldIndex < visibleFields.length) {
                    visibleFields[fieldIndex].value = value;
                    fieldIndex++;
                  }
                }
                return true;
              `
            },
            {
              id: 'click-next',
              action: 'click',
              selector: '.next-button, [type="submit"]'
            }
          ],
          transitions: [
            { id: 't4', from: 'fill-step-1', to: 'check-next-step' }
          ],
          position: { x: 500, y: 250 },
          data: { label: 'Step 1' }
        },
        {
          id: 'check-next-step',
          name: 'Check for Next Step',
          type: 'condition',
          description: 'Determine if more steps exist',
          conditions: [],
          actions: [],
          transitions: [
            {
              id: 't5-has-step-2',
              from: 'check-next-step',
              to: 'fill-step-2',
              condition: {
                id: 'step-2-exists',
                type: 'selector',
                operator: 'exists',
                target: '.step-2, [data-step="2"]'
              }
            },
            {
              id: 't5-final-step',
              from: 'check-next-step',
              to: 'success'
            }
          ],
          position: { x: 700, y: 250 },
          data: { label: 'Check Next' }
        },
        {
          id: 'fill-step-2',
          name: 'Fill Form Step 2',
          type: 'action',
          description: 'Fill remaining form fields',
          conditions: [],
          actions: [
            {
              id: 'fill-remaining-fields',
              action: 'evaluate',
              script: `
                const data = JSON.parse('{{formData}}');
                const remainingFields = Object.entries(data).slice(2);
                remainingFields.forEach(([key, value], index) => {
                  const field = document.querySelector(\`[name="\${key}"], #\${key}\`);
                  if (field) field.value = value;
                });
                return true;
              `
            }
          ],
          transitions: [
            { id: 't6', from: 'fill-step-2', to: 'validate-and-submit' }
          ],
          position: { x: 900, y: 250 },
          data: { label: 'Step 2' }
        },
        {
          id: 'handle-modal-form',
          name: 'Handle Modal Form',
          type: 'action',
          description: 'Fill form within modal dialog',
          conditions: [],
          actions: [
            {
              id: 'fill-modal-form',
              action: 'evaluate',
              script: `
                const data = JSON.parse('{{formData}}');
                const modal = document.querySelector('.modal');
                for (const [key, value] of Object.entries(data)) {
                  const field = modal.querySelector(\`[name="\${key}"], #\${key}\`);
                  if (field) field.value = value;
                }
                return true;
              `
            }
          ],
          transitions: [
            { id: 't7', from: 'handle-modal-form', to: 'validate-and-submit' }
          ],
          position: { x: 500, y: 350 },
          data: { label: 'Modal Form' }
        },
        {
          id: 'validate-and-submit',
          name: 'Validate and Submit',
          type: 'action',
          description: 'Final validation and form submission',
          conditions: [],
          actions: [
            {
              id: 'click-submit',
              action: 'click',
              selector: '[type="submit"], .submit-button'
            },
            {
              id: 'wait-for-response',
              action: 'wait',
              timeout: 3000
            }
          ],
          transitions: [
            { id: 't8', from: 'validate-and-submit', to: 'check-submission-result' }
          ],
          position: { x: 700, y: 350 },
          data: { label: 'Submit' }
        },
        {
          id: 'check-submission-result',
          name: 'Check Submission Result',
          type: 'condition',
          description: 'Verify form submission outcome',
          conditions: [],
          actions: [],
          transitions: [
            {
              id: 't9-success',
              from: 'check-submission-result',
              to: 'success',
              condition: {
                id: 'success-message',
                type: 'selector',
                operator: 'exists',
                target: '.success-message, .thank-you'
              }
            },
            {
              id: 't9-validation-error',
              from: 'check-submission-result',
              to: 'handle-validation-errors',
              condition: {
                id: 'validation-errors',
                type: 'selector',
                operator: 'exists',
                target: '.error-message, .field-error'
              }
            },
            {
              id: 't9-retry',
              from: 'check-submission-result',
              to: 'validate-and-submit',
              delay: 2000
            }
          ],
          position: { x: 900, y: 350 },
          data: { label: 'Check Result' }
        },
        {
          id: 'handle-validation-errors',
          name: 'Handle Validation Errors',
          type: 'action',
          description: 'Process and fix validation errors',
          conditions: [],
          actions: [
            {
              id: 'screenshot-errors',
              action: 'screenshot'
            },
            {
              id: 'extract-error-messages',
              action: 'extract',
              selector: '.error-message'
            }
          ],
          transitions: [
            { id: 't10', from: 'handle-validation-errors', to: 'error' }
          ],
          position: { x: 1100, y: 400 },
          data: { label: 'Handle Errors' }
        },
        {
          id: 'success',
          name: 'Form Submitted Successfully',
          type: 'end',
          description: 'Form processing completed',
          conditions: [],
          actions: [
            {
              id: 'success-screenshot',
              action: 'screenshot'
            }
          ],
          transitions: [],
          position: { x: 1100, y: 200 },
          data: { label: 'Success' }
        },
        {
          id: 'error',
          name: 'Form Submission Failed',
          type: 'error',
          description: 'Unable to complete form submission',
          conditions: [],
          actions: [],
          transitions: [],
          position: { x: 1100, y: 500 },
          data: { label: 'Error' }
        }
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        tags: ['adaptive', 'forms', 'validation', 'multi-step']
      }
    }
  }
];

export const STATE_TEMPLATE_CATEGORIES = [
  'Authentication',
  'Data Processing', 
  'Form Processing',
  'E-commerce',
  'Content Management',
  'Testing & QA'
];

export function getStateTemplatesByCategory(category: string): StateWorkflowTemplate[] {
  return STATE_WORKFLOW_TEMPLATES.filter(template => template.category === category);
}

export function getStateTemplateById(id: string): StateWorkflowTemplate | undefined {
  return STATE_WORKFLOW_TEMPLATES.find(template => template.id === id);
}

export function createWorkflowFromTemplate(template: StateWorkflowTemplate, parameters: Record<string, any>): NonLinearWorkflow {
  const workflow = JSON.parse(JSON.stringify(template.workflow)) as NonLinearWorkflow;
  
  // Replace template variables with actual values
  const workflowStr = JSON.stringify(workflow);
  let processedWorkflowStr = workflowStr;
  
  for (const [key, value] of Object.entries(parameters)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processedWorkflowStr = processedWorkflowStr.replace(placeholder, String(value));
  }
  
  const processedWorkflow = JSON.parse(processedWorkflowStr) as NonLinearWorkflow;
  processedWorkflow.id = uuidv4();
  processedWorkflow.metadata.createdAt = new Date().toISOString();
  
  return processedWorkflow;
} 