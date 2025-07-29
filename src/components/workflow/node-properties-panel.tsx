import { AlertCircle, Save, Settings, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Node } from 'reactflow';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

interface NodeData {
  label: string;
  type: string;
  icon: string;
  [key: string]: any;
}

interface NodePropertiesPanelProps {
  selectedNode: Node<NodeData> | null;
  onUpdateNode: (nodeId: string, data: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'url';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  validation?: (value: any) => string | null;
}

const getFieldsForNodeType = (nodeType: string): FieldConfig[] => {
  const commonFields: FieldConfig[] = [
    {
      key: 'label',
      label: 'Tên Node',
      type: 'text',
      placeholder: 'Nhập tên mô tả...',
      required: true,
    },
  ];

  const specificFields: Record<string, FieldConfig[]> = {
    goto: [
      {
        key: 'url',
        label: 'URL',
        type: 'url',
        placeholder: 'https://example.com',
        required: true,
        validation: (value) => {
          if (!value) return 'URL không được để trống';
          try {
            new URL(value);
            return null;
          } catch {
            return 'URL không hợp lệ';
          }
        },
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        placeholder: '30000',
        min: 1000,
        max: 120000,
      },
    ],
    click: [
      {
        key: 'selector',
        label: 'CSS Selector',
        type: 'text',
        placeholder: '#button, .btn, [data-id="submit"]',
        required: true,
        validation: (value) => {
          if (!value) return 'Selector không được để trống';
          try {
            document.querySelector(value);
            return null;
          } catch {
            return 'Selector không hợp lệ';
          }
        },
      },
      {
        key: 'clickType',
        label: 'Loại Click',
        type: 'select',
        options: [
          { value: 'left', label: 'Click trái' },
          { value: 'right', label: 'Click phải' },
          { value: 'double', label: 'Double click' },
        ],
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        placeholder: '10000',
        min: 1000,
        max: 60000,
      },
    ],
    fill: [
      {
        key: 'selector',
        label: 'CSS Selector',
        type: 'text',
        placeholder: '#input, .form-field, [name="username"]',
        required: true,
      },
      {
        key: 'value',
        label: 'Giá trị',
        type: 'textarea',
        placeholder: 'Nhập text cần điền...',
        required: true,
      },
      {
        key: 'clearFirst',
        label: 'Xóa nội dung cũ',
        type: 'select',
        options: [
          { value: 'true', label: 'Có' },
          { value: 'false', label: 'Không' },
        ],
      },
    ],
    wait: [
      {
        key: 'waitType',
        label: 'Loại chờ',
        type: 'select',
        options: [
          { value: 'time', label: 'Chờ theo thời gian' },
          { value: 'selector', label: 'Chờ element xuất hiện' },
          { value: 'navigation', label: 'Chờ page load' },
        ],
      },
      {
        key: 'delay',
        label: 'Thời gian (ms)',
        type: 'number',
        placeholder: '2000',
        min: 100,
        max: 30000,
      },
      {
        key: 'selector',
        label: 'CSS Selector (nếu chờ element)',
        type: 'text',
        placeholder: '.loading-complete, #content',
      },
    ],
    screenshot: [
      {
        key: 'path',
        label: 'Đường dẫn file',
        type: 'text',
        placeholder: 'screenshots/page.png',
        required: true,
      },
      {
        key: 'fullPage',
        label: 'Chụp toàn trang',
        type: 'select',
        options: [
          { value: 'true', label: 'Có' },
          { value: 'false', label: 'Không' },
        ],
      },
      {
        key: 'quality',
        label: 'Chất lượng (%)',
        type: 'number',
        placeholder: '90',
        min: 10,
        max: 100,
      },
    ],
    extract: [
      {
        key: 'selector',
        label: 'CSS Selector',
        type: 'text',
        placeholder: '.result, #data, .content',
        required: true,
      },
      {
        key: 'attribute',
        label: 'Thuộc tính',
        type: 'select',
        options: [
          { value: 'text', label: 'Text content' },
          { value: 'href', label: 'Link (href)' },
          { value: 'src', label: 'Image source (src)' },
          { value: 'value', label: 'Input value' },
          { value: 'innerHTML', label: 'HTML content' },
        ],
      },
      {
        key: 'multiple',
        label: 'Lấy nhiều kết quả',
        type: 'select',
        options: [
          { value: 'false', label: 'Chỉ lấy 1' },
          { value: 'true', label: 'Lấy tất cả' },
        ],
      },
    ],
  };

  return [...commonFields, ...(specificFields[nodeType] || [])];
};

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form data with selected node
  useEffect(() => {
    if (selectedNode) {
      const initialData = {
        ...selectedNode.data,
      };
      setFormData(initialData);
      setErrors({});
      setHasChanges(false);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Settings className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>Chọn một node để cấu hình</p>
        </div>
      </div>
    );
  }

  const fields = getFieldsForNodeType(selectedNode.data.type);

  const validateField = (field: FieldConfig, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} không được để trống`;
    }

    if (field.validation) {
      return field.validation(value);
    }

    if (field.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) return 'Giá trị phải là số';
      if (field.min !== undefined && num < field.min) {
        return `Giá trị tối thiểu là ${field.min}`;
      }
      if (field.max !== undefined && num > field.max) {
        return `Giá trị tối đa là ${field.max}`;
      }
    }

    return null;
  };

  const handleFieldChange = (field: FieldConfig, value: any) => {
    const newFormData = { ...formData, [field.key]: value };
    setFormData(newFormData);
    setHasChanges(true);

    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field.key]: error || '',
    }));
  };

  const handleSave = () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasError = false;

    fields.forEach(field => {
      const error = validateField(field, formData[field.key]);
      if (error) {
        newErrors[field.key] = error;
        hasError = true;
      }
    });

    setErrors(newErrors);

    if (!hasError) {
      onUpdateNode(selectedNode.id, formData);
      setHasChanges(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc muốn xóa node này?')) {
      onDeleteNode(selectedNode.id);
      onClose();
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {field.type === 'textarea' ? (
          <Textarea
            id={field.key}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            className={`min-h-[80px] ${error ? 'border-red-500' : ''}`}
          />
        ) : field.type === 'select' ? (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field, val)}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="Chọn..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.key}
            type={field.type === 'url' ? 'url' : field.type}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className={error ? 'border-red-500' : ''}
          />
        )}

        {error && (
          <div className="flex items-center gap-1 text-red-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      <Card className="h-full border-0 rounded-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedNode.data.icon}</span>
              <div>
                <CardTitle className="text-sm">{selectedNode.data.label}</CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {selectedNode.data.type}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Node Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ID: {selectedNode.id}
          </div>

          <Separator />

          {/* Configuration Fields */}
          <div className="space-y-4">
            {fields.map(renderField)}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || Object.values(errors).some(Boolean)}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              size="sm"
            >
              Xóa
            </Button>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-1 text-amber-600 text-xs">
              <AlertCircle className="w-3 h-3" />
              Có thay đổi chưa lưu
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NodePropertiesPanel; 