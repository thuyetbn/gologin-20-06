// Non-Linear Workflow Demonstration
// Academic approach showcase inspired by sauermar/web-browser-recorder

import {
    ArrowRight,
    Brain,
    CheckCircle,
    Clock,
    GitBranch,
    Play,
    Square,
    Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// Simplified state machine demo
interface DemoState {
  id: string;
  name: string;
  type: 'start' | 'condition' | 'action' | 'parallel' | 'end' | 'error';
  description: string;
  color: string;
  icon: string;
}

interface DemoTransition {
  from: string;
  to: string;
  condition?: string;
  probability?: number;
}

const DEMO_STATES: DemoState[] = [
  {
    id: 'start',
    name: 'Khởi tạo',
    type: 'start',
    description: 'Bắt đầu quy trình đăng nhập',
    color: 'bg-green-100 border-green-300 text-green-800',
    icon: '🚀'
  },
  {
    id: 'check-auth',
    name: 'Kiểm tra trạng thái',
    type: 'condition',
    description: 'Xác định trạng thái authentication hiện tại',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    icon: '🤔'
  },
  {
    id: 'fill-credentials',
    name: 'Nhập thông tin',
    type: 'action',
    description: 'Điền username và password',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    icon: '⚙️'
  },
  {
    id: 'handle-2fa',
    name: 'Xử lý 2FA',
    type: 'action',
    description: 'Nhập mã xác thực 2 yếu tố',
    color: 'bg-purple-100 border-purple-300 text-purple-800',
    icon: '🔐'
  },
  {
    id: 'handle-captcha',
    name: 'Giải CAPTCHA',
    type: 'parallel',
    description: 'Xử lý thử thách CAPTCHA',
    color: 'bg-orange-100 border-orange-300 text-orange-800',
    icon: '🧩'
  },
  {
    id: 'success',
    name: 'Thành công',
    type: 'end',
    description: 'Đăng nhập hoàn tất',
    color: 'bg-green-100 border-green-300 text-green-800',
    icon: '🏁'
  },
  {
    id: 'error',
    name: 'Lỗi',
    type: 'error',
    description: 'Đăng nhập thất bại',
    color: 'bg-red-100 border-red-300 text-red-800',
    icon: '❌'
  }
];

const DEMO_TRANSITIONS: DemoTransition[] = [
  { from: 'start', to: 'check-auth' },
  { from: 'check-auth', to: 'success', condition: 'Đã đăng nhập', probability: 20 },
  { from: 'check-auth', to: 'fill-credentials', condition: 'Cần đăng nhập', probability: 60 },
  { from: 'check-auth', to: 'handle-captcha', condition: 'Có CAPTCHA', probability: 20 },
  { from: 'fill-credentials', to: 'success', condition: 'Thành công', probability: 50 },
  { from: 'fill-credentials', to: 'handle-2fa', condition: 'Cần 2FA', probability: 30 },
  { from: 'fill-credentials', to: 'error', condition: 'Sai thông tin', probability: 20 },
  { from: 'handle-2fa', to: 'success', condition: 'Mã đúng', probability: 80 },
  { from: 'handle-2fa', to: 'error', condition: 'Mã sai', probability: 20 },
  { from: 'handle-captcha', to: 'fill-credentials', condition: 'Giải xong', probability: 90 },
  { from: 'handle-captcha', to: 'error', condition: 'Quá nhiều lần thử', probability: 10 }
];

const NonLinearDemo: React.FC = () => {
  const [currentState, setCurrentState] = useState<string>('start');
  const [executionPath, setExecutionPath] = useState<string[]>(['start']);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<Array<{
    timestamp: number;
    state: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>>([]);
  const [comparisonMode, setComparisonMode] = useState<'linear' | 'non-linear'>('non-linear');

  const addLog = (state: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setExecutionLogs(prev => [...prev, {
      timestamp: Date.now(),
      state,
      message,
      type
    }]);
  };

  const executeStep = async () => {
    const currentStateObj = DEMO_STATES.find(s => s.id === currentState);
    if (!currentStateObj) return;

    addLog(currentState, `Đang thực thi: ${currentStateObj.name}`, 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find possible transitions
    const transitions = DEMO_TRANSITIONS.filter(t => t.from === currentState);
    
    if (transitions.length === 0) {
      addLog(currentState, `Hoàn tất tại: ${currentStateObj.name}`, 'success');
      setIsExecuting(false);
      return;
    }

    // Simulate non-linear decision making
    let nextTransition;
    if (comparisonMode === 'non-linear') {
      // Weighted random selection based on probability
      const random = Math.random() * 100;
      let cumulativeProbability = 0;
      
      for (const transition of transitions) {
        cumulativeProbability += transition.probability || (100 / transitions.length);
        if (random <= cumulativeProbability) {
          nextTransition = transition;
          break;
        }
      }
    } else {
      // Linear: always take first transition
      nextTransition = transitions[0];
    }

    if (nextTransition) {
      const nextState = nextTransition.to;
      const nextStateObj = DEMO_STATES.find(s => s.id === nextState);
      
      addLog(
        currentState, 
        `Chuyển đến: ${nextStateObj?.name} ${nextTransition.condition ? `(${nextTransition.condition})` : ''}`,
        nextStateObj?.type === 'error' ? 'error' : 
        nextStateObj?.type === 'end' ? 'success' : 'info'
      );
      
      setCurrentState(nextState);
      setExecutionPath(prev => [...prev, nextState]);
      
      // Continue if not end state
      if (nextStateObj?.type !== 'end' && nextStateObj?.type !== 'error') {
        setTimeout(executeStep, 1500);
      } else {
        setIsExecuting(false);
      }
    }
  };

  const startExecution = () => {
    setCurrentState('start');
    setExecutionPath(['start']);
    setExecutionLogs([]);
    setIsExecuting(true);
    
    addLog('start', 'Bắt đầu thực thi workflow', 'info');
    setTimeout(executeStep, 1000);
  };

  const stopExecution = () => {
    setIsExecuting(false);
    addLog(currentState, 'Dừng thực thi', 'warning');
  };

  const resetDemo = () => {
    setCurrentState('start');
    setExecutionPath(['start']);
    setExecutionLogs([]);
    setIsExecuting(false);
  };

  // Linear workflow simulation for comparison
  const linearSteps = ['start', 'fill-credentials', 'success'];
  const getLinearProgress = () => {
    if (!isExecuting) return 0;
    const currentIndex = linearSteps.indexOf(currentState);
    return currentIndex >= 0 ? ((currentIndex + 1) / linearSteps.length) * 100 : 0;
  };

  const getNonLinearProgress = () => {
    if (!isExecuting) return 0;
    const endStates = ['success', 'error'];
    return endStates.includes(currentState) ? 100 : (executionPath.length / 7) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Non-Linear Workflow Demo
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Academic approach to browser automation - Inspired by sauermar/web-browser-recorder
          </p>
        </div>

        {/* Mode Comparison */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              So sánh: Linear vs Non-Linear Execution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={comparisonMode} onValueChange={(value) => setComparisonMode(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="linear">Sequential (Traditional)</TabsTrigger>
                <TabsTrigger value="non-linear">State-Aware (Academic)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="linear" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <ArrowRight className="w-4 h-4" />
                    <span>Start → Fill Credentials → Success</span>
                  </div>
                  <Progress value={getLinearProgress()} className="w-full" />
                  <p className="text-sm text-gray-500">
                    <strong>Limitations:</strong> Không thể handle các trường hợp đặc biệt như 2FA, CAPTCHA, hoặc lỗi authentication.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="non-linear" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <GitBranch className="w-4 h-4" />
                    <span>Adaptive routing based on web page state</span>
                  </div>
                  <Progress value={getNonLinearProgress()} className="w-full" />
                  <p className="text-sm text-gray-500">
                    <strong>Advantages:</strong> Tự động adapt với các scenarios khác nhau, xử lý error states, parallel processing.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* State Machine Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>State Machine Visualization</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={startExecution}
                  disabled={isExecuting}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Play className="w-4 h-4" />
                  Execute
                </Button>
                <Button
                  onClick={stopExecution}
                  disabled={!isExecuting}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
                <Button
                  onClick={resetDemo}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_STATES.map(state => (
                  <div
                    key={state.id}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                      state.color
                    } ${
                      currentState === state.id
                        ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                        : executionPath.includes(state.id)
                        ? 'opacity-75'
                        : 'opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{state.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{state.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {state.type}
                          </Badge>
                          {currentState === state.id && isExecuting && (
                            <Clock className="w-4 h-4 animate-spin" />
                          )}
                          {executionPath.includes(state.id) && currentState !== state.id && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm opacity-75 mt-1">
                          {state.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Show possible transitions */}
                    {currentState === state.id && (
                      <div className="mt-2 space-y-1">
                        {DEMO_TRANSITIONS
                          .filter(t => t.from === state.id)
                          .map((transition, index) => (
                            <div
                              key={index}
                              className="text-xs opacity-60 flex items-center gap-1"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>
                                {DEMO_STATES.find(s => s.id === transition.to)?.name}
                                {transition.condition && ` (${transition.condition})`}
                                {transition.probability && ` - ${transition.probability}%`}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Execution Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time execution monitoring
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {executionLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-xs border-l-4 ${
                      log.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                      log.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                      log.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                      'bg-blue-50 border-blue-400 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.state}</span>
                      <span className="opacity-60">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1">{log.message}</div>
                  </div>
                ))}
                
                {executionLogs.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Click "Execute" để bắt đầu demo</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Features */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🎓 Academic Approach Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 dark:text-green-400">
                  🔄 Finite State Automata
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Workflow execution dựa trên lý thuyết finite state machine, cho phép handling complex logic flows.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 dark:text-blue-400">
                  🤖 Condition-Based Transitions
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transitions được trigger bởi page state conditions thay vì purely sequential execution.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-purple-700 dark:text-purple-400">
                  ⚡ Parallel State Support
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hỗ trợ concurrent execution và synchronization points cho performance optimization.
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">📚 Research Foundation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Concept này được inspired từ <strong>sauermar/web-browser-recorder</strong> - một bachelor thesis project 
                có academic backing, sử dụng Web Automation Workflow (WAW) format với finite automaton execution model.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NonLinearDemo; 