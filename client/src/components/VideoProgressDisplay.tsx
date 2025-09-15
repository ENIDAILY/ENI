import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle, 
  Clock, 
  ImageIcon, 
  Mic, 
  Video, 
  Settings, 
  Sparkles,
  Download,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  message: string;
}

interface VideoProgressDisplayProps {
  sessionId?: string;
  onComplete?: (videoUrl: string, duration: number) => void;
  onError?: (error: string) => void;
  className?: string;
}

const PROGRESS_STEPS: Omit<ProgressStep, 'status' | 'progress' | 'message'>[] = [
  { id: 'initializing', label: 'Initializing', icon: Settings },
  { id: 'calculating-timings', label: 'Calculating Timings', icon: Clock },
  { id: 'generating-audio', label: 'Generating Audio', icon: Mic },
  { id: 'generating-images', label: 'Generating Images', icon: ImageIcon },
  { id: 'creating-video', label: 'Creating Video', icon: Video },
  { id: 'finalizing', label: 'Finalizing', icon: Sparkles },
];

export default function VideoProgressDisplay({ 
  sessionId, 
  onComplete, 
  onError, 
  className 
}: VideoProgressDisplayProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(
    PROGRESS_STEPS.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      message: 'Waiting...'
    }))
  );
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Connect to WebSocket for real-time updates on dedicated path
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/progress`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for video progress');
      // Subscribe to the specific session
      ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId: sessionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.sessionId === sessionId) {
          if (data.type === 'progress') {
            updateProgress(data.step, data.progress, data.message);
          } else if (data.type === 'completed') {
            // Handle completion with video data
            updateProgress('completed', 100, data.message || 'Video generation completed!');
            setIsComplete(true);
            
            // Call completion callback with video data
            if (data.data && data.data.videoUrl && data.data.duration) {
              console.log('Video generation completed:', data.data);
              onComplete?.(data.data.videoUrl, data.data.duration);
            }
          } else if (data.type === 'error') {
            // Handle error
            setHasError(true);
            updateProgress('error', 0, data.message || 'Video generation failed');
            
            // Call error callback
            const errorMessage = data.data?.error?.message || data.message || 'Video generation failed';
            onError?.(errorMessage);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setHasError(true);
      onError?.('Connection error occurred during video generation');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, onError]);

  const updateProgress = (stepId: string, progress: number, message: string) => {
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status: (progress >= 100 ? 'completed' : 'active') as ProgressStep['status'],
            progress: Math.min(progress, 100),
            message
          };
        }
        
        // Update previous steps to completed if current step is active
        const currentStepIndex = PROGRESS_STEPS.findIndex(s => s.id === stepId);
        const thisStepIndex = PROGRESS_STEPS.findIndex(s => s.id === step.id);
        if (thisStepIndex < currentStepIndex && step.status !== 'completed') {
          return {
            ...step,
            status: 'completed' as ProgressStep['status'],
            progress: 100,
            message: 'Completed'
          };
        }
        
        return step;
      });
      
      // Calculate overall progress
      const totalProgress = newSteps.reduce((sum, step) => sum + step.progress, 0);
      const overallPercent = Math.round(totalProgress / newSteps.length);
      setOverallProgress(overallPercent);
      
      // Check if completed
      if (overallPercent >= 100 && stepId === 'completed') {
        setIsComplete(true);
        // onComplete will be called from the parent component when video generation finishes
      }
      
      return newSteps;
    });
  };

  const getStepIcon = (step: ProgressStep) => {
    const IconComponent = step.icon;
    
    if (step.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" data-testid={`icon-${step.id}-completed`} />;
    }
    
    if (step.status === 'active') {
      return <Loader2 className="w-4 h-4 animate-spin text-primary" data-testid={`icon-${step.id}-active`} />;
    }
    
    if (step.status === 'error') {
      return <IconComponent className="w-4 h-4 text-destructive" data-testid={`icon-${step.id}-error`} />;
    }
    
    return <IconComponent className="w-4 h-4 text-muted-foreground" data-testid={`icon-${step.id}-pending`} />;
  };

  const getStepBadgeVariant = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'default'; // Green-ish completed state
      case 'active':
        return 'secondary'; // Active processing state
      case 'error':
        return 'destructive';
      default:
        return 'outline'; // Pending state
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)} data-testid="video-progress-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Generation Progress
          </CardTitle>
          <Badge 
            variant={isComplete ? "default" : hasError ? "destructive" : "secondary"}
            data-testid="overall-status-badge"
          >
            {isComplete ? "Completed" : hasError ? "Error" : `${overallProgress}%`}
          </Badge>
        </div>
        <Progress 
          value={overallProgress} 
          className="w-full mt-2" 
          data-testid="overall-progress-bar"
        />
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                step.status === 'active' && "bg-accent/50",
                step.status === 'completed' && "bg-muted/30"
              )}
              data-testid={`step-${step.id}`}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className={cn(
                      "font-medium text-sm",
                      step.status === 'completed' && "text-muted-foreground",
                      step.status === 'active' && "text-foreground",
                      step.status === 'pending' && "text-muted-foreground"
                    )}
                    data-testid={`step-label-${step.id}`}
                  >
                    {step.label}
                  </span>
                  <Badge 
                    variant={getStepBadgeVariant(step)} 
                    className="text-xs px-2"
                    data-testid={`step-badge-${step.id}`}
                  >
                    {step.status === 'active' ? `${Math.round(step.progress)}%` : step.status}
                  </Badge>
                </div>
                
                <p 
                  className="text-xs text-muted-foreground truncate" 
                  data-testid={`step-message-${step.id}`}
                >
                  {step.message}
                </p>
                
                {step.status === 'active' && step.progress > 0 && (
                  <Progress 
                    value={step.progress} 
                    className="w-full mt-2 h-1" 
                    data-testid={`step-progress-${step.id}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {isComplete && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800" data-testid="completion-message">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Video generation completed successfully!</span>
            </div>
          </div>
        )}
        
        {hasError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800" data-testid="error-message">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <span className="text-sm font-medium">An error occurred during video generation</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}