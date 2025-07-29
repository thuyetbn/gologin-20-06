import {
    Download,
    Eye,
    Filter,
    Search,
    Star,
    Users
} from 'lucide-react';
import React, { useState } from 'react';
import {
    getPopularTemplates,
    getTemplatesByCategory,
    TEMPLATE_CATEGORIES,
    WORKFLOW_TEMPLATES,
    WorkflowTemplate
} from '../../data/workflow-templates';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

interface WorkflowTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

const WorkflowTemplatesModal: React.FC<WorkflowTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  // Filter templates based on category and search
  const filteredTemplates = getTemplatesByCategory(selectedCategory).filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const popularTemplates = getPopularTemplates(3);

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const TemplateCard: React.FC<{ template: WorkflowTemplate; showPreview?: boolean }> = ({ 
    template, 
    showPreview = true 
  }) => (
    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {template.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs mt-1">
              {template.category}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Users className="w-3 h-3" />
            {template.usageCount}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {template.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs px-2 py-0.5"
            >
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {template.nodes.length} nodes • {template.edges.length} connections
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleSelectTemplate(template)}
            className="flex-1 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Use Template
          </Button>
          {showPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewTemplate(template)}
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              📚 Workflow Templates Library
              <Badge variant="secondary" className="text-xs">
                {WORKFLOW_TEMPLATES.length} templates
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="h-full flex flex-col">
              <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Tabs */}
                <TabsList className="grid grid-cols-6 w-full">
                  {TEMPLATE_CATEGORIES.map(category => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6">
                {/* Popular Templates Section */}
                {selectedCategory === 'All' && searchQuery === '' && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Popular Templates
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {popularTemplates.map(template => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Templates */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedCategory === 'All' ? 'All Templates' : selectedCategory}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {filteredTemplates.length} templates
                    </span>
                  </div>
                  
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Không tìm thấy template nào</p>
                      <p className="text-sm">Thử thay đổi từ khóa tìm kiếm hoặc category</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                      {filteredTemplates.map(template => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewTemplate.name}
                <Badge variant="secondary">{previewTemplate.category}</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {previewTemplate.description}
              </p>
              
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{previewTemplate.nodes.length} nodes</span>
                <span>{previewTemplate.edges.length} connections</span>
                <span>{previewTemplate.usageCount} uses</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {previewTemplate.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Node List Preview */}
              <div>
                <h4 className="font-semibold mb-2">Workflow Steps:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewTemplate.nodes.map((node, index) => (
                    <div key={node.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-mono text-gray-500 w-6">
                        {index + 1}.
                      </span>
                      <span className="text-lg">{node.config.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{node.config.label}</div>
                        <div className="text-xs text-gray-500 capitalize">{node.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleSelectTemplate(previewTemplate)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default WorkflowTemplatesModal; 