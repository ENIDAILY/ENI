import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

interface ImagePrompt {
  visual: string;
  voiceover: string;
}

interface VideoGenerationResult {
  videoPath: string;
  duration: number;
  optimizedTimings: number[];
}

// Progress callback interface for real-time updates
export interface ProgressCallback {
  (step: string, progress: number, message: string): void;
}

// Enhanced progress tracking
export interface VideoGenerationProgress {
  currentStep: string;
  progress: number; // 0-100
  message: string;
  totalSteps: number;
  completedSteps: number;
}

/**
 * Calculate optimal timing for each voiceover segment using AI-powered analysis
 * Targets 25-40 second total video duration for caput-style videos
 */
export function calculateOptimalTimings(voiceoverSegments: string[]): number[] {
  // Target duration for caput-style videos (25-40 seconds)
  const MIN_TARGET_DURATION = 25;
  const MAX_TARGET_DURATION = 40;
  
  // Calculate relative importance/weight for each segment
  const segmentWeights: number[] = [];
  let totalWeight = 0;
  
  for (const segment of voiceoverSegments) {
    const wordCount = segment.split(/\s+/).length;
    const charCount = segment.length;
    const punctuationCount = (segment.match(/[.,!?;:]/g) || []).length;
    
    // Calculate base weight based on content length and complexity
    let weight = wordCount * 0.7 + charCount * 0.02 + punctuationCount * 0.5;
    
    // Adjust weight for content emphasis
    if (segment.includes('!') || segment.toLowerCase().includes('important') || 
        segment.toLowerCase().includes('critical') || segment.toLowerCase().includes('key')) {
      weight *= 1.2; // Emphasized content gets 20% more weight
    }
    
    if (segment.toLowerCase().includes('call to action') || segment.toLowerCase().includes('contact') || 
        segment.toLowerCase().includes('today') || segment.toLowerCase().includes('now')) {
      weight *= 1.1; // Call to action gets 10% more weight
    }
    
    // Ensure minimum weight to prevent segments being too short
    weight = Math.max(weight, 2);
    
    segmentWeights.push(weight);
    totalWeight += weight;
  }
  
  // Determine target total duration based on content complexity
  const avgWordsPerSegment = voiceoverSegments.reduce((sum, segment) => 
    sum + segment.split(/\s+/).length, 0) / voiceoverSegments.length;
  
    // More complex content (more words) gets closer to max duration
  const complexityRatio = Math.min(avgWordsPerSegment / 15, 1); // Cap at 15 words per segment
  const targetDuration = MIN_TARGET_DURATION + (MAX_TARGET_DURATION - MIN_TARGET_DURATION) * complexityRatio;
  
  // Distribute target duration proportionally based on weights
  const timings: number[] = [];
  for (let i = 0; i < segmentWeights.length; i++) {
    const proportionalDuration = (segmentWeights[i] / totalWeight) * targetDuration;
    
    // Ensure each segment is between 2.5 and 12 seconds for smooth transitions
    const finalDuration = Math.max(2.5, Math.min(12, proportionalDuration));
    timings.push(Math.round(finalDuration * 10) / 10); // Round to 1 decimal place
  }
  
  // Fine-tune to ensure total duration is within target range
  const actualTotal = timings.reduce((sum, t) => sum + t, 0);
  if (actualTotal < MIN_TARGET_DURATION || actualTotal > MAX_TARGET_DURATION) {
    const adjustmentFactor = targetDuration / actualTotal;
    for (let i = 0; i < timings.length; i++) {
      timings[i] = Math.round(timings[i] * adjustmentFactor * 10) / 10;
    }
  }
  
  console.log(`Target duration: ${targetDuration}s, Actual total: ${timings.reduce((sum, t) => sum + t, 0)}s`);
  
  return timings;
}

/**
 * Download an image from URL to local file
 */
async function downloadImage(url: string, filename: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const imagePath = path.join('/tmp', filename);
  fs.writeFileSync(imagePath, Buffer.from(buffer));
  
  return imagePath;
}

/**
 * Generate audio for complete voiceover using the TTS API with progress tracking
 */
async function generateAudioFile(voiceoverText: string, voiceId: string, onProgress?: ProgressCallback): Promise<string> {
  onProgress?.('generating-audio', 0, '🎤 Generating voiceover audio...');
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  const response = await fetch(`${baseUrl}/api/generate-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      text: voiceoverText,
      voiceId: voiceId
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS generation failed: ${response.statusText}`);
  }

  onProgress?.('generating-audio', 50, '🔗 Getting audio URL...');

  const data = await response.json();
  if (!data.audio_url) {
    throw new Error('No audio URL returned from TTS service');
  }

  // Download the audio file
  onProgress?.('generating-audio', 75, '📥 Downloading audio file...');
  const audioResponse = await fetch(data.audio_url);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  const audioPath = path.join('/tmp', `voiceover_${Date.now()}.wav`);
  fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

  onProgress?.('generating-audio', 100, '✅ Audio generation completed');
  return audioPath;
}

/**
 * Generate all images for the video with progress tracking
 */
async function generateAllImages(imagePrompts: ImagePrompt[], onProgress?: ProgressCallback): Promise<string[]> {
  const imagePaths: string[] = [];
  
  for (let i = 0; i < imagePrompts.length; i++) {
    const prompt = imagePrompts[i];
    
    onProgress?.('generating-images', (i / imagePrompts.length) * 100, `🎨 Generating image ${i + 1} of ${imagePrompts.length}`);
    
    // Generate image using the image generation API
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: prompt.visual }),
    });

    if (!response.ok) {
      throw new Error(`Image generation failed for prompt ${i + 1}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.output_url) {
      throw new Error(`No image URL returned for prompt ${i + 1}`);
    }

    // Download the image
    onProgress?.('generating-images', ((i + 0.5) / imagePrompts.length) * 100, `📥 Downloading image ${i + 1}`);
    const imagePath = await downloadImage(data.output_url, `image_${i + 1}_${Date.now()}.png`);
    imagePaths.push(imagePath);
  }
  
  onProgress?.('generating-images', 100, `✅ All ${imagePrompts.length} images generated successfully`);
  return imagePaths;
}

/**
 * Get actual duration of media file using FFprobe
 */
async function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ]);
    
    let stdout = '';
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(stdout.trim());
        resolve(duration);
      } else {
        reject(new Error(`FFprobe failed with code ${code}`));
      }
    });
    
    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe spawn error: ${error.message}`));
    });
  });
}

/**
 * Create video using FFmpeg with 9:16 aspect ratio and proper audio sync
 */
async function createVideoWithFFmpeg(
  imagePaths: string[], 
  audioPath: string, 
  timings: number[],
  onProgress?: ProgressCallback
): Promise<{ videoPath: string; actualDuration: number }> {
  onProgress?.('creating-video', 0, '⚙️ Setting up video creation...');
  
  const outputPath = path.join('/tmp', `video_${Date.now()}.mp4`);
  
  onProgress?.('creating-video', 10, '⏱️ Calculating optimal timings...');
  
  // Get actual audio duration
  const audioDuration = await getMediaDuration(audioPath);
  
  // Calculate crossfade parameters
  const fadeDuration = imagePaths.length > 1 ? 1.0 : 0; // 1 second crossfade between segments
  const numCrossfades = Math.max(0, imagePaths.length - 1);
  const totalCrossfadeDuration = numCrossfades * fadeDuration;
  
  // Calculate video duration accounting for crossfade overlaps
  const rawVideoDuration = timings.reduce((sum, t) => sum + t, 0);
  const calculatedVideoDuration = rawVideoDuration - totalCrossfadeDuration;
  
  console.log('Duration analysis:', { 
    audioDuration, 
    rawVideoDuration,
    calculatedVideoDuration,
    totalCrossfadeDuration,
    timings 
  });
  
  // Adjust timings to match audio duration while keeping within 25-40s range
  let adjustedTimings = [...timings];
  const targetDuration = Math.min(40, Math.max(25, audioDuration));
  const targetRawDuration = targetDuration + totalCrossfadeDuration;
  
  if (Math.abs(audioDuration - calculatedVideoDuration) > 0.5) {
    const scaleFactor = targetRawDuration / rawVideoDuration;
    adjustedTimings = timings.map(t => t * scaleFactor);
    console.log('Adjusted timings for audio sync and duration constraints:', adjustedTimings);
  }
  
  onProgress?.('creating-video', 20, '🎬 Building slideshow with crossfade transitions...');
  
  // Create FFmpeg command for 9:16 video (1080x1920) with smooth transitions
  const args = [
    '-y', // Overwrite output file
  ];
  
  // Add image inputs with adjusted durations
  for (let i = 0; i < imagePaths.length; i++) {
    args.push('-loop', '1', '-t', adjustedTimings[i].toString(), '-i', imagePaths[i]);
  }
  
  // Add audio input
  args.push('-i', audioPath);
  
  // Complex filter for 9:16 video with smooth transitions and caput-style effects
  let filterComplex = '';
  
  // Scale, pad, and add subtle zoom/movement to each image for caput-style effect
  for (let i = 0; i < imagePaths.length; i++) {
    // Add subtle zoom and pan movement for each image to create dynamic caput-style video
    const zoomStart = 1.0;
    const zoomEnd = 1.05; // Subtle 5% zoom for smoother effect
    const duration = adjustedTimings[i];
    const totalFrames = Math.floor(duration * 30); // 30 FPS
    
    // Use consistent 1080x1920 sizing with proper constraints to prevent hanging
    filterComplex += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,`;
    filterComplex += `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,`;
    filterComplex += `zoompan=z=${zoomStart}+${(zoomEnd-zoomStart)/totalFrames}*on:d=${totalFrames}:s=1080x1920:fps=30,`;
    filterComplex += `trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v${i}];`;
  }
  
  // Create smooth crossfade transitions between segments
  if (imagePaths.length > 1) {
    // Start with first video
    let transitionChain = '[v0]';
    let cumulativeOffset = 0;
    
    for (let i = 1; i < imagePaths.length; i++) {
      // Calculate proper offset accounting for crossfade overlaps
      cumulativeOffset += adjustedTimings[i - 1] - fadeDuration;
      const fadeOffset = Math.max(0, cumulativeOffset).toFixed(3);
      
      if (i === 1) {
        // First transition
        filterComplex += `${transitionChain}[v${i}]xfade=transition=fade:duration=${fadeDuration.toFixed(3)}:offset=${fadeOffset}[fade${i}];`;
        transitionChain = `[fade${i}]`;
      } else {
        // Subsequent transitions
        filterComplex += `${transitionChain}[v${i}]xfade=transition=fade:duration=${fadeDuration.toFixed(3)}:offset=${fadeOffset}[fade${i}];`;
        transitionChain = `[fade${i}]`;
      }
    }
    
    filterComplex += `${transitionChain}format=yuv420p[outv]`;
  } else {
    // Single image, no transitions needed
    filterComplex += `[v0]format=yuv420p[outv]`;
  }
  
  args.push(
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', `${imagePaths.length}:a`, // Audio from last input
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-r', '30', // 30 FPS
    '-preset', 'medium', // Good quality/speed balance
    '-crf', '23', // High quality encoding
    '-shortest', // Terminate when shortest stream ends
    outputPath
  );
  
  console.log('FFmpeg command:', ['ffmpeg', ...args].join(' '));
  onProgress?.('creating-video', 30, '🎥 Starting FFmpeg video encoding...');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    let isResolved = false;
    
    // Add timeout to prevent hanging (120 seconds)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.error('FFmpeg timeout after 120 seconds, killing process');
        console.error('FFmpeg stderr output:', stderr);
        ffmpeg.kill('SIGKILL');
        isResolved = true;
        // Clean up temporary output file on timeout
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup temporary video file:', cleanupError);
        }
        reject(new Error(`FFmpeg timeout after 120 seconds. Stderr: ${stderr}`));
      }
    }, 120000);
    
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      
      // Parse FFmpeg progress from stderr output
      if (output.includes('time=')) {
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const currentTime = parseFloat(timeMatch[1]) * 3600 + parseFloat(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
          const progress = Math.min(95, 30 + (currentTime / targetDuration) * 65); // 30-95% range for encoding
          onProgress?.('creating-video', progress, `🎬 Encoding video... ${currentTime.toFixed(1)}s / ${targetDuration.toFixed(1)}s`);
        }
      }
      
      // Stream stderr to logs for real-time debugging
      console.log('FFmpeg stderr:', output.trim());
    });
    
    ffmpeg.on('close', async (code) => {
      if (isResolved) return;
      clearTimeout(timeout);
      isResolved = true;
      
      if (code === 0) {
        try {
          console.log('FFmpeg completed successfully');
          onProgress?.('creating-video', 95, '📊 Finalizing video...');
          
          // Get actual video duration
          const actualDuration = await getMediaDuration(outputPath);
          console.log(`Generated video duration: ${actualDuration}s`);
          onProgress?.('creating-video', 100, '✅ Video creation completed successfully!');
          
          resolve({ videoPath: outputPath, actualDuration });
        } catch (error) {
          reject(new Error(`Failed to get video duration: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        console.error(`FFmpeg failed with code ${code}`);
        console.error('FFmpeg stderr:', stderr);
        // Clean up temporary output file on failure
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup temporary video file:', cleanupError);
        }
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      if (isResolved) return;
      clearTimeout(timeout);
      isResolved = true;
      console.error('FFmpeg spawn error:', error.message);
      // Clean up temporary output file on spawn error
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup temporary video file:', cleanupError);
      }
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

/**
 * Main video generation function with progress tracking
 */
export async function generateVideo(
  imagePrompts: ImagePrompt[], 
  voiceId?: string,
  onProgress?: ProgressCallback
): Promise<VideoGenerationResult> {
  // Use default voice if not provided, allow for future customization
  const selectedVoiceId = voiceId || process.env.DEFAULT_VOICE_ID || "en-US-terrell";
  
  let audioPath: string | null = null;
  let imagePaths: string[] = [];
  
  try {
    console.log('Starting video generation process...');
    onProgress?.('initializing', 0, '🚀 Starting video generation process...');
    
    // Extract voiceover segments
    const voiceoverSegments = imagePrompts.map(prompt => prompt.voiceover.trim());
    
    // Calculate optimal timings using AI
    onProgress?.('calculating-timings', 5, '🧮 Calculating optimal timings for segments...');
    const optimizedTimings = calculateOptimalTimings(voiceoverSegments);
    console.log('Calculated optimized timings:', optimizedTimings);
    
    // Combine all voiceover text
    const completeVoiceover = voiceoverSegments.join(' ').replace(/\s+/g, ' ').trim();
    
    // Generate audio file (20% of total progress)
    console.log('Generating audio...');
    audioPath = await generateAudioFile(completeVoiceover, selectedVoiceId, onProgress);
    
    // Generate all images (40% of total progress)
    console.log('Generating images...');
    imagePaths = await generateAllImages(imagePrompts, onProgress);
    
    // Create video with proper audio synchronization (30% of total progress)
    console.log('Creating video with FFmpeg...');
    const { videoPath, actualDuration } = await createVideoWithFFmpeg(imagePaths, audioPath, optimizedTimings, onProgress);
    
    console.log('Video generation completed successfully');
    onProgress?.('completed', 100, '🎉 Video generation completed successfully!');
    
    return {
      videoPath,
      duration: actualDuration, // Use actual duration from ffprobe
      optimizedTimings
    };
  } catch (error) {
    console.error('Video generation failed:', error);
    onProgress?.('error', 0, `❌ Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  } finally {
    // Always clean up temporary files, regardless of success or failure
    onProgress?.('finalizing', 95, '🧹 Cleaning up temporary files...');
    
    // Clean up image files
    imagePaths.forEach(path => {
      try { 
        if (fs.existsSync(path)) {
          fs.unlinkSync(path); 
        }
      } catch (e) { 
        console.error(`Failed to cleanup image file ${path}:`, e); 
      }
    });
    
    // Clean up audio file
    if (audioPath) {
      try { 
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath); 
        }
      } catch (e) { 
        console.error(`Failed to cleanup audio file ${audioPath}:`, e); 
      }
    }
  }
}