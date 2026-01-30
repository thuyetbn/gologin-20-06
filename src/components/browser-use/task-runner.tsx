"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Bot, Loader2, Play, Square } from "lucide-react";
import { useState } from "react";

interface TaskRunnerProps {
  profileId: string;
  cdpUrl: string;
  onTaskComplete?: (result: TaskResult) => void;
}

interface TaskResult {
  success: boolean;
  result?: string;
  steps: string[];
  error?: string;
}

// Google Gemini models (all free!)
const GOOGLE_MODELS = [
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Fast)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B (Light)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Best)" },
];

export function BrowserUseTaskRunner({ profileId, cdpUrl, onTaskComplete }: TaskRunnerProps) {
  const [task, setTask] = useState("");
  const [llmProvider, setLlmProvider] = useState<string>("google"); // Default to free Google Gemini
  const [model, setModel] = useState<string>("gemini-2.0-flash-exp");
  const [maxSteps, setMaxSteps] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);

  const handleRunTask = async () => {
    if (!task.trim() || !cdpUrl) return;

    setIsRunning(true);
    setResult(null);

    try {
      const taskResult = await (window.api.invoke as any)("browser-use:run-task", {
        profileId,
        cdpUrl,
        task: task.trim(),
        llmProvider,
        model: llmProvider === "google" ? model : undefined,
        maxSteps,
        useVision: true,
      });

      setResult(taskResult);
      onTaskComplete?.(taskResult);
    } catch (error) {
      const errorResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        steps: [],
      };
      setResult(errorResult);
      onTaskComplete?.(errorResult);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await (window.api.invoke as any)("browser-use:disconnect", profileId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to stop task:", error);
    }
  };

  const exampleTasks = [
    "Go to google.com and search for 'AI automation'",
    "Go to github.com and find trending repositories",
    "Navigate to news.ycombinator.com and get top 5 headlines",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Task Runner
        </CardTitle>
        <CardDescription>
          Use AI to automate browser tasks on this profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Input */}
        <div className="space-y-2">
          <Label htmlFor="task">Task Description</Label>
          <textarea
            id="task"
            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Describe what you want the AI to do..."
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={isRunning}
          />
        </div>

        {/* Example Tasks */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Examples</Label>
          <div className="flex flex-wrap gap-2">
            {exampleTasks.map((example, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setTask(example)}
                disabled={isRunning}
              >
                {example.substring(0, 30)}...
              </Button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>LLM Provider</Label>
            <Select value={llmProvider} onValueChange={setLlmProvider} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">🆓 Google Gemini (Free)</SelectItem>
                <SelectItem value="anthropic">💰 Anthropic (Claude)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Max Steps</Label>
            <Select value={maxSteps.toString()} onValueChange={(v) => setMaxSteps(parseInt(v))} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 steps</SelectItem>
                <SelectItem value="30">30 steps</SelectItem>
                <SelectItem value="50">50 steps</SelectItem>
                <SelectItem value="100">100 steps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Google Model Selector */}
        {llmProvider === "google" && (
          <div className="space-y-2">
            <Label>Google Model</Label>
            <Select value={model} onValueChange={setModel} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All Google Gemini models are free! Get API key at{" "}
              <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                aistudio.google.com
              </a>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStop} className="flex-1">
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button onClick={handleRunTask} disabled={!task.trim()} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Run Task
            </Button>
          )}
        </div>

        {/* Running Indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">AI is working on your task...</span>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-md ${result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
            <div className="font-medium mb-2">
              {result.success ? "✅ Task Completed" : "❌ Task Failed"}
            </div>
            {result.result && (
              <div className="text-sm mb-2">
                <span className="font-medium">Result:</span> {result.result}
              </div>
            )}
            {result.error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                <span className="font-medium">Error:</span> {result.error}
              </div>
            )}
            {result.steps.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer">
                  View {result.steps.length} steps
                </summary>
                <ul className="mt-2 text-xs space-y-1 max-h-40 overflow-auto">
                  {result.steps.map((step, i) => (
                    <li key={i} className="p-1 bg-background rounded">
                      {i + 1}. {step}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
