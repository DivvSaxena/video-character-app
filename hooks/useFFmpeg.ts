import { useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { loadFFmpeg } from '@/lib/ffmpeg';

export interface FFmpegProgress {
  progress: number;
  time: number;
}

export function useFFmpeg() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FFmpegProgress>({ progress: 0, time: 0 });
  
  const ffmpegRef = useRef<FFmpeg | null>(null);
  
  const load = useCallback(async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const ffmpeg = await loadFFmpeg();
      ffmpegRef.current = ffmpeg;
      
      // Set up progress tracking
      ffmpeg.on('progress', ({ progress, time }) => {
        setProgress({ progress, time });
      });
      
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FFmpeg');
      console.error('FFmpeg loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isLoading]);
  
  // Auto-load on mount
  useEffect(() => {
    load();
  }, [load]);
  
  return {
    ffmpeg: ffmpegRef.current,
    isLoaded,
    isLoading,
    error,
    progress,
    load
  };
}
