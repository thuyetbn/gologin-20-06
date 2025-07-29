import {
    Download,
    Loader2,
    Play,
    Save,
    Trash2,
    Upload
} from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onClear: () => void;
  isExecuting: boolean;
  canExecute: boolean;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflowName,
  onWorkflowNameChange,
  onSave,
  onExecute,
  onClear,
  isExecuting,
  canExecute,
}) => {
  const handleExportJSON = () => {
    // TODO: Export workflow as JSON
    console.log('Export JSON');
  };

  const handleImportJSON = () => {
    // TODO: Import workflow from JSON file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workflow = JSON.parse(e.target?.result as string);
            console.log('Imported workflow:', workflow);
            // TODO: Load workflow into editor
          } catch (error) {
            console.error('Invalid JSON file:', error);
            alert('File JSON không hợp lệ');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <Label htmlFor="workflow-name" className="text-sm font-medium whitespace-nowrap">
            Tên workflow:
          </Label>
          <Input
            id="workflow-name"
            value={workflowName}
            onChange={(e) => onWorkflowNameChange(e.target.value)}
            placeholder="Nhập tên workflow..."
            className="w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportJSON}
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!workflowName.trim()}
        >
          <Save className="w-4 h-4 mr-2" />
          Lưu
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Xóa tất cả
        </Button>

        <Button
          onClick={onExecute}
          disabled={!canExecute || isExecuting}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {isExecuting ? 'Đang chạy...' : 'Chạy Workflow'}
        </Button>
      </div>
    </div>
  );
};

export default WorkflowToolbar; 