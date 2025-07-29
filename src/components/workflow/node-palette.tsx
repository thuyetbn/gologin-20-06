import { Plus } from 'lucide-react';
import React from 'react';
import { NODE_CATEGORIES, NODE_COLORS, WORKFLOW_NODE_TEMPLATES } from '../../constants/workflow-templates';
import { NodeType } from '../../types/workflow';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface NodePaletteProps {
  onAddNode: (nodeType: NodeType) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const categories = Object.entries(NODE_CATEGORIES);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      navigation: 'Điều hướng',
      interaction: 'Tương tác',
      waiting: 'Chờ đợi',
      extraction: 'Trích xuất'
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-4">
      {categories.map(([category, nodeTypes]) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {getCategoryLabel(category)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {nodeTypes.map((nodeType) => {
                const template = WORKFLOW_NODE_TEMPLATES[nodeType as NodeType];
                const color = NODE_COLORS[nodeType as NodeType];
                
                return (
                  <Button
                    key={nodeType}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => onAddNode(nodeType as NodeType)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <span className="text-lg flex-shrink-0">
                        {template.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {template.label}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${color}20`,
                              color: color,
                              borderColor: color 
                            }}
                          >
                            {nodeType}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 leading-tight">
                          {template.description}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NodePalette; 