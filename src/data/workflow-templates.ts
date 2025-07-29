export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  nodes: any[];
  edges: any[];
  createdBy?: string;
  usageCount?: number;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'login-form',
    name: 'Form Login',
    description: 'Tự động đăng nhập vào website với username và password',
    category: 'Authentication',
    tags: ['login', 'form', 'authentication'],
    usageCount: 245,
    nodes: [
      {
        id: '1',
        type: 'goto',
        position: { x: 250, y: 50 },
        config: {
          label: 'Đi đến trang login',
          type: 'goto',
          icon: '🌐',
          url: 'https://example.com/login',
          timeout: 30000,
        },
      },
      {
        id: '2',
        type: 'fill',
        position: { x: 250, y: 150 },
        config: {
          label: 'Nhập username',
          type: 'fill',
          icon: '✏️',
          selector: '#username',
          value: 'your_username',
          clearFirst: 'true',
        },
      },
      {
        id: '3',
        type: 'fill',
        position: { x: 250, y: 250 },
        config: {
          label: 'Nhập password',
          type: 'fill',
          icon: '🔒',
          selector: '#password',
          value: 'your_password',
          clearFirst: 'true',
        },
      },
      {
        id: '4',
        type: 'click',
        position: { x: 250, y: 350 },
        config: {
          label: 'Click Login',
          type: 'click',
          icon: '👆',
          selector: '#login-button',
          clickType: 'left',
          timeout: 10000,
        },
      },
      {
        id: '5',
        type: 'wait',
        position: { x: 250, y: 450 },
        config: {
          label: 'Chờ redirect',
          type: 'wait',
          icon: '⏳',
          waitType: 'navigation',
          delay: 5000,
        },
      },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
      { source: '4', target: '5' },
    ],
  },
  {
    id: 'data-scraping',
    name: 'Web Scraping',
    description: 'Thu thập dữ liệu từ website và lưu thành file',
    category: 'Data Collection',
    tags: ['scraping', 'data', 'extraction'],
    usageCount: 189,
    nodes: [
      {
        id: '1',
        type: 'goto',
        position: { x: 250, y: 50 },
        config: {
          label: 'Đi đến website',
          type: 'goto',
          icon: '🌐',
          url: 'https://example.com/data',
          timeout: 30000,
        },
      },
      {
        id: '2',
        type: 'wait',
        position: { x: 250, y: 150 },
        config: {
          label: 'Chờ load dữ liệu',
          type: 'wait',
          icon: '⏳',
          waitType: 'selector',
          selector: '.data-container',
          delay: 5000,
        },
      },
      {
        id: '3',
        type: 'extract',
        position: { x: 250, y: 250 },
        config: {
          label: 'Trích xuất tiêu đề',
          type: 'extract',
          icon: '📝',
          selector: 'h1, h2, .title',
          attribute: 'text',
          multiple: 'true',
        },
      },
      {
        id: '4',
        type: 'extract',
        position: { x: 450, y: 250 },
        config: {
          label: 'Trích xuất links',
          type: 'extract',
          icon: '🔗',
          selector: 'a[href]',
          attribute: 'href',
          multiple: 'true',
        },
      },
      {
        id: '5',
        type: 'screenshot',
        position: { x: 350, y: 350 },
        config: {
          label: 'Chụp màn hình',
          type: 'screenshot',
          icon: '📷',
          path: 'scraping-result.png',
          fullPage: 'true',
          quality: 90,
        },
      },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '2', target: '4' },
      { source: '3', target: '5' },
      { source: '4', target: '5' },
    ],
  },
  {
    id: 'form-automation',
    name: 'Tự động điền Form',
    description: 'Tự động điền và submit form với dữ liệu có sẵn',
    category: 'Automation',
    tags: ['form', 'automation', 'submit'],
    usageCount: 156,
    nodes: [
      {
        id: '1',
        type: 'goto',
        position: { x: 250, y: 50 },
        config: {
          label: 'Đi đến form',
          type: 'goto',
          icon: '🌐',
          url: 'https://example.com/contact',
          timeout: 30000,
        },
      },
      {
        id: '2',
        type: 'fill',
        position: { x: 150, y: 150 },
        config: {
          label: 'Điền tên',
          type: 'fill',
          icon: '👤',
          selector: '#name',
          value: 'John Doe',
          clearFirst: 'true',
        },
      },
      {
        id: '3',
        type: 'fill',
        position: { x: 350, y: 150 },
        config: {
          label: 'Điền email',
          type: 'fill',
          icon: '📧',
          selector: '#email',
          value: 'john@example.com',
          clearFirst: 'true',
        },
      },
      {
        id: '4',
        type: 'fill',
        position: { x: 250, y: 250 },
        config: {
          label: 'Điền message',
          type: 'fill',
          icon: '💬',
          selector: '#message',
          value: 'This is an automated message',
          clearFirst: 'true',
        },
      },
      {
        id: '5',
        type: 'click',
        position: { x: 250, y: 350 },
        config: {
          label: 'Submit form',
          type: 'click',
          icon: '📤',
          selector: '#submit',
          clickType: 'left',
          timeout: 10000,
        },
      },
      {
        id: '6',
        type: 'wait',
        position: { x: 250, y: 450 },
        config: {
          label: 'Chờ success message',
          type: 'wait',
          icon: '✅',
          waitType: 'selector',
          selector: '.success-message',
          delay: 5000,
        },
      },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
      { source: '2', target: '4' },
      { source: '3', target: '4' },
      { source: '4', target: '5' },
      { source: '5', target: '6' },
    ],
  },
  {
    id: 'e-commerce-checkout',
    name: 'E-commerce Checkout',
    description: 'Tự động hoàn thành quá trình mua hàng online',
    category: 'E-commerce',
    tags: ['checkout', 'shopping', 'payment'],
    usageCount: 134,
    nodes: [
      {
        id: '1',
        type: 'goto',
        position: { x: 250, y: 50 },
        config: {
          label: 'Đi đến sản phẩm',
          type: 'goto',
          icon: '🛍️',
          url: 'https://shop.example.com/product/123',
          timeout: 30000,
        },
      },
      {
        id: '2',
        type: 'click',
        position: { x: 250, y: 150 },
        config: {
          label: 'Add to Cart',
          type: 'click',
          icon: '🛒',
          selector: '.add-to-cart',
          clickType: 'left',
          timeout: 10000,
        },
      },
      {
        id: '3',
        type: 'click',
        position: { x: 250, y: 250 },
        config: {
          label: 'Go to Cart',
          type: 'click',
          icon: '🛒',
          selector: '.cart-icon',
          clickType: 'left',
          timeout: 10000,
        },
      },
      {
        id: '4',
        type: 'click',
        position: { x: 250, y: 350 },
        config: {
          label: 'Proceed to Checkout',
          type: 'click',
          icon: '💳',
          selector: '.checkout-btn',
          clickType: 'left',
          timeout: 10000,
        },
      },
      {
        id: '5',
        type: 'fill',
        position: { x: 150, y: 450 },
        config: {
          label: 'Điền địa chỉ',
          type: 'fill',
          icon: '🏠',
          selector: '#address',
          value: '123 Main St',
          clearFirst: 'true',
        },
      },
      {
        id: '6',
        type: 'fill',
        position: { x: 350, y: 450 },
        config: {
          label: 'Điền phone',
          type: 'fill',
          icon: '📞',
          selector: '#phone',
          value: '+1234567890',
          clearFirst: 'true',
        },
      },
      {
        id: '7',
        type: 'screenshot',
        position: { x: 250, y: 550 },
        config: {
          label: 'Chụp màn hình đơn hàng',
          type: 'screenshot',
          icon: '📷',
          path: 'order-confirmation.png',
          fullPage: 'false',
          quality: 95,
        },
      },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
      { source: '4', target: '5' },
      { source: '4', target: '6' },
      { source: '5', target: '7' },
      { source: '6', target: '7' },
    ],
  },
  {
    id: 'monitoring-check',
    name: 'Website Monitoring',
    description: 'Kiểm tra trạng thái website và chụp màn hình định kỳ',
    category: 'Monitoring',
    tags: ['monitoring', 'health-check', 'screenshot'],
    usageCount: 98,
    nodes: [
      {
        id: '1',
        type: 'goto',
        position: { x: 250, y: 50 },
        config: {
          label: 'Đi đến website cần monitor',
          type: 'goto',
          icon: '🔍',
          url: 'https://example.com',
          timeout: 30000,
        },
      },
      {
        id: '2',
        type: 'wait',
        position: { x: 250, y: 150 },
        config: {
          label: 'Chờ page load hoàn toàn',
          type: 'wait',
          icon: '⏳',
          waitType: 'navigation',
          delay: 3000,
        },
      },
      {
        id: '3',
        type: 'extract',
        position: { x: 150, y: 250 },
        config: {
          label: 'Kiểm tra title',
          type: 'extract',
          icon: '📋',
          selector: 'title',
          attribute: 'text',
          multiple: 'false',
        },
      },
      {
        id: '4',
        type: 'screenshot',
        position: { x: 350, y: 250 },
        config: {
          label: 'Chụp màn hình',
          type: 'screenshot',
          icon: '📷',
          path: 'monitor-screenshot.png',
          fullPage: 'true',
          quality: 80,
        },
      },
      {
        id: '5',
        type: 'extract',
        position: { x: 250, y: 350 },
        config: {
          label: 'Kiểm tra error messages',
          type: 'extract',
          icon: '❌',
          selector: '.error, .alert-danger',
          attribute: 'text',
          multiple: 'true',
        },
      },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '2', target: '4' },
      { source: '3', target: '5' },
      { source: '4', target: '5' },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  'All',
  'Authentication',
  'Data Collection', 
  'Automation',
  'E-commerce',
  'Monitoring',
];

export const getTemplatesByCategory = (category: string): WorkflowTemplate[] => {
  if (category === 'All') {
    return WORKFLOW_TEMPLATES;
  }
  return WORKFLOW_TEMPLATES.filter(template => template.category === category);
};

export const getPopularTemplates = (limit: number = 3): WorkflowTemplate[] => {
  return [...WORKFLOW_TEMPLATES]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
}; 