import { Bot, User, Copy, Image, Music, Mic, Wand2, Loader2, Download, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import VideoProgressDisplay from "@/components/VideoProgressDisplay";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
}

interface ImagePrompt {
  visual: string;
  voiceover: string;
}

interface ParsedEvangelicalContent {
  imagePrompts: ImagePrompt[];
  music: {
    title: string;
    genre: string;
    link: string;
  } | null;
}

export default function ChatMessage({ message, isUser, timestamp }: ChatMessageProps) {
  const [showCopy, setShowCopy] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<{ [key: number]: boolean }>({});
  const [generatedImages, setGeneratedImages] = useState<{ [key: number]: string }>({});
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [optimizedTimings, setOptimizedTimings] = useState<number[]>([]);
  const [videoSessionId, setVideoSessionId] = useState<string | null>(null);
  const [showVideoProgress, setShowVideoProgress] = useState(false);
  const { toast } = useToast();

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    console.log('Message copied to clipboard');
  };

  const copyImagePrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      description: "Image prompt copied to clipboard!",
      duration: 2000,
    });
  };

  const copyCompleteVersion = (parsedContent: ParsedEvangelicalContent) => {
    let completeVersion = "🖼 **6 Image Prompts with Split Voiceover:**\n\n";
    
    parsedContent.imagePrompts.forEach((prompt, index) => {
      completeVersion += `**Image ${index + 1}:**\n`;
      completeVersion += `Visual: ${prompt.visual}\n`;
      completeVersion += `Voiceover: ${prompt.voiceover}\n\n`;
    });
    
    if (parsedContent.music) {
      completeVersion += "🎵 **Background Music:**\n";
      completeVersion += `- Title: ${parsedContent.music.title}\n`;
      completeVersion += `- Genre: ${parsedContent.music.genre}\n`;
      completeVersion += `- Link: ${parsedContent.music.link}\n`;
    }
    
    navigator.clipboard.writeText(completeVersion);
    toast({
      description: "Complete version copied to clipboard!",
      duration: 2000,
    });
  };

  const copyCompleteVoiceover = (parsedContent: ParsedEvangelicalContent) => {
    const completeVoiceover = parsedContent.imagePrompts
      .map(prompt => prompt.voiceover.trim())
      .filter(voiceover => voiceover.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    
    navigator.clipboard.writeText(completeVoiceover);
    toast({
      description: "Complete voiceover script copied to clipboard!",
      duration: 2000,
    });
  };

  const generateAudio = async (parsedContent: ParsedEvangelicalContent) => {
    const completeVoiceover = parsedContent.imagePrompts
      .map(prompt => prompt.voiceover.trim())
      .filter(voiceover => voiceover.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!completeVoiceover) {
      toast({
        title: "No voiceover text found",
        description: "Cannot generate audio without voiceover content",
        duration: 3000,
      });
      return;
    }

    setGeneratingAudio(true);
    
    try {
      const response = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: completeVoiceover,
          voiceId: "en-US-terrell"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = errorData.error;
        
        if (error && error.code) {
          switch (error.code) {
            case 'NOT_CONFIGURED':
              toast({
                title: "Service Not Available",
                description: error.details || "Text-to-speech is not configured",
                duration: 5000,
              });
              return;
              
            case 'INVALID_API_KEY':
              toast({
                title: "API Configuration Error",
                description: error.details || "Invalid murf.ai API key",
                duration: 5000,
              });
              return;
              
            case 'RATE_LIMITED':
              const retryMessage = error.retryAfter 
                ? `Please wait ${error.retryAfter} seconds before trying again`
                : "Please wait before trying again";
              toast({
                title: "Rate Limited",
                description: retryMessage,
                duration: 5000,
              });
              return;
              
            case 'TEXT_TOO_LONG':
              toast({
                title: "Text Too Long",
                description: error.details || "Please use shorter text",
                duration: 5000,
              });
              return;
              
            case 'TIMEOUT':
              toast({
                title: "Request Timed Out",
                description: error.details || "Try again with shorter text",
                duration: 5000,
              });
              return;
              
            default:
              toast({
                title: "Audio Generation Failed",
                description: error.message || "Please try again later",
                duration: 5000,
              });
              return;
          }
        }
        
        throw new Error(`Audio generation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.audio_url) {
        setAudioUrl(data.audio_url);
        toast({
          description: "Audio generated successfully!",
          duration: 2000,
        });
      } else {
        throw new Error("No audio URL in response");
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      toast({
        title: "Audio Generation Failed",
        description: "Failed to generate audio. Please try again.",
        duration: 3000,
      });
    } finally {
      setGeneratingAudio(false);
    }
  };

  const generateVideo = async (parsedContent: ParsedEvangelicalContent) => {
    setGeneratingVideo(true);
    setShowVideoProgress(true);
    setVideoSessionId(null);
    
    try {
      console.log('Starting video generation with AI-optimized timing...');
      
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imagePrompts: parsedContent.imagePrompts,
          voiceId: "en-US-terrell"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = errorData.error;
        
        if (error && error.code) {
          switch (error.code) {
            case 'TTS_SERVICE_ERROR':
              toast({
                title: "Audio Generation Failed",
                description: error.details || "Failed to generate voiceover audio",
                duration: 5000,
              });
              return;
              
            case 'IMAGE_SERVICE_ERROR':
              toast({
                title: "Image Generation Failed", 
                description: error.details || "Failed to generate video images",
                duration: 5000,
              });
              return;
              
            case 'VIDEO_PROCESSING_ERROR':
              toast({
                title: "Video Processing Failed",
                description: error.details || "Failed to create video file",
                duration: 5000,
              });
              return;
              
            default:
              toast({
                title: "Video Generation Failed",
                description: error.message || "Please try again later",
                duration: 5000,
              });
              return;
          }
        }
        
        throw new Error(`Video generation failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Set sessionId immediately for WebSocket progress tracking
      if (data.sessionId) {
        setVideoSessionId(data.sessionId);
        console.log('Video generation started with sessionId:', data.sessionId);
        
        // Note: Video URL will be received via WebSocket completion event
        toast({
          description: "Video generation started! Watch progress below.",
          duration: 3000,
        });
      } else {
        throw new Error("No sessionId in response");
      }
    } catch (error) {
      console.error('Video generation request error:', error);
      toast({
        title: "Video Generation Request Failed",
        description: "Failed to start video generation. Please try again.",
        duration: 3000,
      });
      
      // Only hide progress on request error, not on successful start
      setGeneratingVideo(false);
      setShowVideoProgress(false);
    }
  };

  const generateImage = async (prompt: string, index: number) => {
    setGeneratingImages(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = errorData.error;
        
        // Handle structured error responses
        if (error && error.code) {
          switch (error.code) {
            case 'OUT_OF_CREDITS':
              toast({
                title: "Hugging Face Account Out of Credits",
                description: error.details || "Please add payment information to continue generating images",
                action: error.helpUrl ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(error.helpUrl, '_blank')}
                    data-testid="button-add-billing"
                  >
                    Add Billing
                  </Button>
                ) : undefined,
                duration: 8000,
              });
              return;
              
            case 'INVALID_API_KEY':
              toast({
                title: "API Configuration Error",
                description: error.details || "Invalid Hugging Face API key",
                duration: 5000,
              });
              return;
              
            case 'RATE_LIMITED':
              const retryMessage = error.retryAfter 
                ? `Please wait ${error.retryAfter} seconds before trying again`
                : "Please wait before trying again";
              toast({
                title: "Rate Limited",
                description: retryMessage,
                duration: 5000,
              });
              return;
              
            case 'TIMEOUT':
              toast({
                title: "Request Timed Out",
                description: error.details || "Try again with a simpler prompt",
                duration: 5000,
              });
              return;
              
            case 'PROMPT_TOO_LONG':
              toast({
                title: "Prompt Too Long",
                description: error.details || "Please use a shorter description",
                duration: 5000,
              });
              return;
              
            case 'NOT_CONFIGURED':
              toast({
                title: "Service Not Available",
                description: error.details || "Image generation is not configured",
                duration: 5000,
              });
              return;
              
            default:
              toast({
                title: "Generation Failed",
                description: error.message || "Please try again later",
                duration: 5000,
              });
              return;
          }
        }
        
        // Fallback for non-structured errors
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.output_url) {
        setGeneratedImages(prev => ({ ...prev, [index]: data.output_url }));
        toast({
          description: "Image generated successfully!",
          duration: 2000,
        });
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate image. Please try again.",
        duration: 3000,
      });
    } finally {
      setGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const sanitizeUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isEvangelicalContent = (text: string): boolean => {
    return text.includes('🖼') && text.includes('**Image 1:**') && text.includes('Visual:') && text.includes('Voiceover:');
  };

  const parseEvangelicalContent = (text: string): ParsedEvangelicalContent | null => {
    if (!isEvangelicalContent(text)) return null;

    const imagePrompts: ImagePrompt[] = [];
    
    // Extract image prompts using simpler string parsing
    for (let i = 1; i <= 6; i++) {
      const imageStart = text.indexOf(`**Image ${i}:**`);
      if (imageStart === -1) continue;
      
      const visualStart = text.indexOf('Visual:', imageStart);
      const voiceoverStart = text.indexOf('Voiceover:', imageStart);
      
      if (visualStart === -1 || voiceoverStart === -1) continue;
      
      const nextImageStart = text.indexOf(`**Image ${i + 1}:**`, imageStart);
      const musicStart = text.indexOf('🎵', imageStart);
      const endPos = nextImageStart !== -1 ? nextImageStart : (musicStart !== -1 ? musicStart : text.length);
      
      const visual = text.substring(visualStart + 7, voiceoverStart).trim();
      const voiceover = text.substring(voiceoverStart + 10, endPos).trim();
      
      if (visual && voiceover) {
        imagePrompts.push({
          visual: visual,
          voiceover: voiceover
        });
      }
    }

    // Extract music using simpler parsing
    const musicStart = text.indexOf('🎵 Background Music:');
    let music = null;
    
    if (musicStart !== -1) {
      const titleStart = text.indexOf('- Title:', musicStart);
      const genreStart = text.indexOf('- Genre:', musicStart);
      const linkStart = text.indexOf('- Link:', musicStart);
      
      if (titleStart !== -1 && genreStart !== -1 && linkStart !== -1) {
        const title = text.substring(titleStart + 8, genreStart).trim();
        const genre = text.substring(genreStart + 8, linkStart).trim();
        const linkLine = text.substring(linkStart + 7);
        const link = linkLine.split('\n')[0].trim();
        
        music = { title, genre, link };
      }
    }

    return { imagePrompts, music };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const parsedContent = !isUser ? parseEvangelicalContent(message) : null;

  if (!isUser && parsedContent) {
    // Render structured evangelical content
    return (
      <div className="flex gap-4 p-4 group">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        </div>
        
        <div className="flex-1 max-w-4xl">
          <div className="bg-card border border-card-border rounded-2xl p-6 mr-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                6 Image Prompts with Split Voiceover
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => generateVideo(parsedContent)}
                  disabled={generatingVideo}
                  data-testid="button-edit-video"
                  className="h-8 px-3 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {generatingVideo ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Video className="w-3 h-3 mr-1" />
                  )}
                  {generatingVideo ? 'Creating Video...' : 'Edit (Auto Video)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCompleteVersion(parsedContent)}
                  data-testid="button-copy-complete-version"
                  className="h-8 px-3 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Complete Version
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              {parsedContent.imagePrompts.map((prompt, index) => (
                <div key={index} className="border rounded-lg p-4 bg-background">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-sm">Image {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyImagePrompt(prompt.visual)}
                        data-testid={`button-copy-image-${index + 1}`}
                        className="h-8 px-2 text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => generateImage(prompt.visual, index)}
                        disabled={generatingImages[index]}
                        data-testid={`button-generate-image-${index + 1}`}
                        className="h-8 px-2 text-xs"
                      >
                        {generatingImages[index] ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3 mr-1" />
                        )}
                        {generatingImages[index] ? 'Generating...' : 'Generate Image'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">VISUAL PROMPT:</p>
                      <p className="text-sm leading-relaxed">{prompt.visual}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">VOICEOVER ({index * 5}-{(index + 1) * 5}s):</p>
                      <p className="text-sm leading-relaxed italic text-muted-foreground">"{prompt.voiceover}"</p>
                    </div>
                    
                    {generatedImages[index] && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">GENERATED IMAGE:</p>
                        <div className="border rounded-lg overflow-hidden bg-muted/20">
                          <img 
                            src={generatedImages[index]} 
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-auto"
                            data-testid={`img-generated-${index + 1}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Complete Voiceover Script Section */}
            <div className="mt-6 border rounded-lg p-4 bg-background">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Complete Voiceover Script ({parsedContent.imagePrompts.length * 5} seconds)
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCompleteVoiceover(parsedContent)}
                    data-testid="button-copy-complete-voiceover"
                    className="h-8 px-3 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Script
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => generateAudio(parsedContent)}
                    disabled={generatingAudio}
                    data-testid="button-generate-audio"
                    className="h-8 px-3 text-xs"
                  >
                    {generatingAudio ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    {generatingAudio ? 'Generating...' : 'Generate Audio'}
                  </Button>
                </div>
              </div>
              <div 
                className="text-sm leading-relaxed italic text-muted-foreground border-l-4 border-primary/20 pl-4"
                data-testid="text-complete-voiceover"
              >
                "{parsedContent.imagePrompts
                  .map(prompt => prompt.voiceover.trim())
                  .filter(voiceover => voiceover.length > 0)
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim()}"
              </div>
              
              {audioUrl && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Generated Audio</span>
                    </div>
                    <a
                      href={audioUrl}
                      download="voiceover-audio.wav"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs hover:bg-primary/90 transition-colors"
                      data-testid="link-download-audio"
                    >
                      <Download className="w-3 h-3" />
                      Download Audio
                    </a>
                  </div>
                  <audio controls className="w-full mt-2" data-testid="audio-player">
                    <source src={audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
            
            {/* Video Generation Progress */}
            {showVideoProgress && videoSessionId && (
              <div className="mt-6">
                <VideoProgressDisplay 
                  sessionId={videoSessionId}
                  onComplete={(videoUrl, duration) => {
                    console.log('Video generation completed via WebSocket:', { videoUrl, duration });
                    setVideoUrl(videoUrl);
                    setVideoDuration(duration);
                    setGeneratingVideo(false);
                    setShowVideoProgress(false);
                    
                    toast({
                      title: "Video Generated Successfully! 🎬",
                      description: `Created ${duration.toFixed(1)}s video with AI-optimized timing`,
                      duration: 4000,
                    });
                  }}
                  onError={(error) => {
                    console.error('Video generation failed via WebSocket:', error);
                    toast({
                      title: "Video Generation Failed",
                      description: error,
                      duration: 3000,
                    });
                    setGeneratingVideo(false);
                    setShowVideoProgress(false);
                  }}
                />
              </div>
            )}
            
            {/* Generated Video Section */}
            {videoUrl && (
              <div className="mt-6 border rounded-lg p-4 bg-background">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    Generated Video ({videoDuration?.toFixed(1)}s • 9:16 Format)
                  </h4>
                  <a
                    href={videoUrl}
                    download="evangelical-video.mp4"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs hover:bg-primary/90 transition-colors"
                    data-testid="link-download-video"
                  >
                    <Download className="w-3 h-3" />
                    Download Video
                  </a>
                </div>
                
                <div className="space-y-3">
                  <video 
                    controls 
                    className="w-full max-w-md mx-auto rounded-lg border bg-muted/20" 
                    data-testid="video-player"
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video element.
                  </video>
                  
                  {optimizedTimings.length > 0 && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">AI-OPTIMIZED TIMING:</p>
                      <div className="flex flex-wrap gap-2">
                        {optimizedTimings.map((timing, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                          >
                            Image {index + 1}: {timing.toFixed(1)}s
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        AI calculated optimal timing based on content length, emotion, and call-to-action elements.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {parsedContent.music && (
              <div className="mt-6 border rounded-lg p-4 bg-background">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Background Music
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Title:</span> {parsedContent.music.title}</p>
                  <p><span className="font-medium">Genre:</span> {parsedContent.music.genre}</p>
                  <p><span className="font-medium">Link:</span> {(() => {
                    const safeUrl = sanitizeUrl(parsedContent.music.link);
                    return safeUrl ? (
                      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{parsedContent.music.link}</a>
                    ) : (
                      <span className="text-muted-foreground">{parsedContent.music.link} (invalid URL)</span>
                    );
                  })()}</p>
                </div>
              </div>
            )}
          </div>
          
          {timestamp && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatTime(timestamp)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render regular message
  return (
    <div className={`flex gap-4 p-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>
      
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div 
          className={`inline-block p-4 rounded-2xl relative ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-12' 
              : 'bg-card border border-card-border mr-12'
          }`}
          onMouseEnter={() => setShowCopy(true)}
          onMouseLeave={() => setShowCopy(false)}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message}
          </div>
          
          {showCopy && (
            <Button
              variant="ghost" 
              size="icon"
              className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={copyMessage}
              data-testid="button-copy-message"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {timestamp && (
          <div className={`text-xs text-muted-foreground mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}