import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { NODE_COLORS, WORKFLOW_NODE_TEMPLATES } from '../../constants/workflow-templates';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface WorkflowNodeData {
  label: string;
  action: any;
  isValid?: boolean;
  errors?: string[];
}

const WorkflowNode: React.FC<NodeProps<WorkflowNodeData>> = ({ data, selected }) => {
  const nodeType = data.action?.action;
  const template = nodeType ? WORKFLOW_NODE_TEMPLATES[nodeType] : null;
  const color = nodeType ? NODE_COLORS[nodeType] : '#6b7280';

  return (
    <div className={`min-w-[200px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400"
      />
      
      <Card className="shadow-md border-2" style={{ borderColor: color }}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{template?.icon || '⚙️'}</span>
            <span className="font-medium text-sm">{data.label}</span>
          </div>
          
          {nodeType && (
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: color, color: color }}
            >
              {nodeType}
            </Badge>
          )}
          
          {!data.isValid && data.errors && data.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-500">
              ⚠️ Cấu hình chưa hợp lệ
            </div>
          )}
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  );
};

export default memo(WorkflowNode); 