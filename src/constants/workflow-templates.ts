import { NodeTemplate, NodeType } from '../types/workflow';

export const WORKFLOW_NODE_TEMPLATES: Record<NodeType, NodeTemplate> = {
  goto: {
    type: 'goto',
    label: 'Đi đến URL',
    description: 'Điều hướng trình duyệt đến một URL cụ thể',
    icon: '🌐',
    defaultData: {
      action: 'goto',
      timeout: 30000
    },
    configFields: [
      {
        name: 'url',
        type: 'text',
        label: 'URL',
        required: true,
        placeholder: 'https://example.com'
      },
      {
        name: 'timeout',
        type: 'number',
        label: 'Timeout (ms)',
        placeholder: '30000',
        validation: { min: 1000, max: 120000 }
      }
    ]
  },

  click: {
    type: 'click',
    label: 'Click',
    description: 'Click vào một element trên trang',
    icon: '👆',
    defaultData: {
      action: 'click',
      timeout: 5000
    },
    configFields: [
      {
        name: 'selector',
        type: 'text',
        label: 'CSS Selector',
        required: true,
        placeholder: '#button, .class, [data-id="value"]'
      },
      {
        name: 'timeout',
        type: 'number',
        label: 'Timeout (ms)',
        placeholder: '5000',
        validation: { min: 1000, max: 60000 }
      }
    ]
  },

  fill: {
    type: 'fill',
    label: 'Điền Input',
    description: 'Điền text vào một input field',
    icon: '✏️',
    defaultData: {
      action: 'fill',
      timeout: 5000
    },
    configFields: [
      {
        name: 'selector',
        type: 'text',
        label: 'CSS Selector',
        required: true,
        placeholder: 'input[name="username"], #email'
      },
      {
        name: 'value',
        type: 'text',
        label: 'Giá trị',
        required: true,
        placeholder: 'Nội dung cần điền'
      },
      {
        name: 'timeout',
        type: 'number',
        label: 'Timeout (ms)',
        placeholder: '5000',
        validation: { min: 1000, max: 60000 }
      }
    ]
  },

  waitForSelector: {
    type: 'waitForSelector',
    label: 'Chờ Element',
    description: 'Chờ cho đến khi một element xuất hiện trên trang',
    icon: '⏳',
    defaultData: {
      action: 'waitForSelector',
      timeout: 10000
    },
    configFields: [
      {
        name: 'selector',
        type: 'text',
        label: 'CSS Selector',
        required: true,
        placeholder: '.loading, #result'
      },
      {
        name: 'timeout',
        type: 'number',
        label: 'Timeout (ms)',
        placeholder: '10000',
        validation: { min: 1000, max: 120000 }
      }
    ]
  },

  screenshot: {
    type: 'screenshot',
    label: 'Chụp màn hình',
    description: 'Chụp screenshot của trang hiện tại',
    icon: '📷',
    defaultData: {
      action: 'screenshot',
      path: 'screenshot.png'
    },
    configFields: [
      {
        name: 'path',
        type: 'text',
        label: 'Đường dẫn file',
        placeholder: 'screenshot.png'
      },
      {
        name: 'selector',
        type: 'text',
        label: 'CSS Selector (tuỳ chọn)',
        placeholder: 'Để trống để chụp toàn trang'
      }
    ]
  },

  extractText: {
    type: 'extractText',
    label: 'Trích xuất Text',
    description: 'Lấy text từ một element trên trang',
    icon: '📝',
    defaultData: {
      action: 'extractText',
      timeout: 5000
    },
    configFields: [
      {
        name: 'selector',
        type: 'text',
        label: 'CSS Selector',
        required: true,
        placeholder: '.result, #content, h1'
      },
      {
        name: 'attribute',
        type: 'select',
        label: 'Thuộc tính',
        options: [
          { value: 'textContent', label: 'Text Content' },
          { value: 'innerText', label: 'Inner Text' },
          { value: 'innerHTML', label: 'Inner HTML' },
          { value: 'value', label: 'Value' },
          { value: 'href', label: 'Href' },
          { value: 'src', label: 'Src' }
        ]
      },
      {
        name: 'timeout',
        type: 'number',
        label: 'Timeout (ms)',
        placeholder: '5000',
        validation: { min: 1000, max: 60000 }
      }
    ]
  },

  wait: {
    type: 'wait',
    label: 'Chờ',
    description: 'Tạm dừng thực thi trong một khoảng thời gian',
    icon: '⏱️',
    defaultData: {
      action: 'wait',
      delay: 1000
    },
    configFields: [
      {
        name: 'delay',
        type: 'number',
        label: 'Thời gian chờ (ms)',
        required: true,
        placeholder: '1000',
        validation: { min: 100, max: 60000 }
      }
    ]
  }
};

export const NODE_COLORS = {
  goto: '#3b82f6',      // blue
  click: '#ef4444',     // red  
  fill: '#10b981',      // emerald
  waitForSelector: '#f59e0b', // amber
  screenshot: '#8b5cf6',  // violet
  extractText: '#06b6d4', // cyan
  wait: '#6b7280'       // gray
};

export const NODE_CATEGORIES = {
  navigation: ['goto'],
  interaction: ['click', 'fill'],
  waiting: ['waitForSelector', 'wait'],
  extraction: ['screenshot', 'extractText']
}; 