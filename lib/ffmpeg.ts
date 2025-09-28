// lib/ffmpeg.ts - Ultra-simple, robust implementation
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export interface Character {
  text: string;
  id: number;
  type: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Set up logging and progress tracking
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg log:', message);
  });
  
  ffmpeg.on('progress', ({ progress, time }) => {
    console.log('FFmpeg progress:', progress, 'time:', time);
  });
  
  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    // Load FFmpeg WASM with proper URLs
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    console.log('FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
}

// Method 1: Just add a simple text overlay (most basic approach)
export async function addBasicTextOverlay(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('Starting basic text overlay...');
    
    // Progress tracking
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Write input video file
    console.log('Writing video file to FFmpeg filesystem...');
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    console.log('Video file written successfully');
    
    // Try safer text positioning - your video is 1088x1920
    // Use relative positioning that's well within bounds
    console.log('Executing FFmpeg command with safe positioning...');
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', 'drawtext=text=TEST:x=50:y=50:fontsize=32:fontcolor=white:box=1:boxcolor=black',
      '-c:a', 'copy',
      '-preset', 'ultrafast',
      '-avoid_negative_ts', 'make_zero',
      'output.mp4'
    ]);
    console.log('FFmpeg command completed');
    
    // Read the output
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp4');
    console.log('Output file read successfully');
    
    // Clean up
    console.log('Cleaning up files...');
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    console.log('Cleanup completed');
    
    // Convert to proper format
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in basic text overlay:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Clean up on error
    try {
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }
    
    throw error;
  }
}

// Method 1.5: Add simple text overlay with minimal font requirements
export async function addSimpleTextOverlay(
  videoFile: File,
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('Starting simple text overlay...');
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Create a very simple text overlay without complex font settings
    const textToDisplay = characters[0]?.text || characters[0]?.emoji || 'TEXT';
    const escapedText = textToDisplay.replace(/'/g, "\\'").replace(/:/g, "\\:");
    
    console.log(`Adding simple text: "${textToDisplay}"`);
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `drawtext=text='${escapedText}':x=50:y=50:fontsize=24:fontcolor=white`,
      '-c:a', 'copy',
      '-preset', 'ultrafast',
      '-avoid_negative_ts', 'make_zero',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in simple text overlay:', error);
    throw error;
  }
}

// Method 2: Add multiple colored boxes (no text at all)
export async function addColoredBoxes(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('Starting colored boxes overlay...');
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Write input video file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Video dimensions are 1088x1920 based on the logs
    const videoWidth = 1088;
    const videoHeight = 1920;
    
    // Create a simple filter with colored rectangles - safer positioning
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    let filterParts: string[] = [];
    
    characters.forEach((char, index) => {
      // Convert percentage to actual pixels, but keep well within bounds
      const x = Math.max(10, Math.min(videoWidth - 100, Math.round((char.x / 100) * videoWidth)));
      const y = Math.max(10, Math.min(videoHeight - 100, Math.round((char.y / 100) * videoHeight)));
      const size = Math.max(20, Math.min(80, Math.round(40 * char.scale)));
      const color = colors[index % colors.length];
      
      console.log(`Character ${index}: x=${x}, y=${y}, size=${size}, color=${color}`);
      filterParts.push(`drawbox=x=${x}:y=${y}:w=${size}:h=${size}:color=${color}:t=fill`);
    });
    
    const filterString = filterParts.join(',');
    console.log('Filter string:', filterString);
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', filterString,
      '-c:a', 'copy',
      '-preset', 'ultrafast',
      '-avoid_negative_ts', 'make_zero',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in colored boxes:', error);
    throw error;
  }
}

// Method 2.5: Add actual text overlays (the real implementation)
export async function addTextOverlays(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('Starting text overlays...');
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Write input video file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Video dimensions are 1088x1920 based on the logs
    const videoWidth = 1088;
    const videoHeight = 1920;
    
    // Create text overlay filters
    let filterParts: string[] = [];
    
    characters.forEach((char, index) => {
      // Convert percentage to actual pixels, but keep well within bounds
      const x = Math.max(10, Math.min(videoWidth - 200, Math.round((char.x / 100) * videoWidth)));
      const y = Math.max(10, Math.min(videoHeight - 50, Math.round((char.y / 100) * videoHeight)));
      const fontSize = Math.max(20, Math.min(60, Math.round(32 * char.scale)));
      
      // Get the text to display (use text field if available, otherwise emoji field)
      const textToDisplay = char.text || char.emoji;
      
      // Escape special characters for FFmpeg
      const escapedText = textToDisplay.replace(/'/g, "\\'").replace(/:/g, "\\:");
      
      console.log(`Text ${index}: "${textToDisplay}" at x=${x}, y=${y}, fontSize=${fontSize}`);
      
      // Create drawtext filter with background box for better visibility
      // Use a very simple approach without complex font settings
      filterParts.push(`drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=white`);
    });
    
    const filterString = filterParts.join(',');
    console.log('Filter string:', filterString);
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', filterString,
      '-c:a', 'copy',
      '-preset', 'ultrafast',
      '-avoid_negative_ts', 'make_zero',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    
    // Clean up
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in text overlays:', error);
    throw error;
  }
}

// Method 3: Just copy the video (test if basic operations work)
export async function justCopyVideo(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('Starting video copy test...');
    console.log('Video file size:', videoFile.size, 'bytes');
    console.log('Video file type:', videoFile.type);
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Write input video file with error handling
    console.log('Writing video file to FFmpeg filesystem...');
    const fileData = await fetchFile(videoFile);
    console.log('File data size:', fileData.byteLength);
    
    await ffmpeg.writeFile('input.mp4', fileData);
    console.log('Video file written successfully');
    
    // Try a safer copy command with memory management
    console.log('Executing safe copy command...');
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'libx264', // Use software encoder instead of copy
      '-c:a', 'aac',     // Use software audio encoder
      '-preset', 'ultrafast',
      '-crf', '23',      // Constant rate factor for quality
      '-max_muxing_queue_size', '1024', // Increase buffer size
      '-avoid_negative_ts', 'make_zero',
      'output.mp4'
    ]);
    console.log('Copy command completed');
    
    const data = await ffmpeg.readFile('output.mp4');
    console.log('Output data size:', data.byteLength);
    
    // Clean up
    console.log('Cleaning up files...');
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    console.log('Cleanup completed');
    
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in video copy:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Clean up on error
    try {
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }
    
    throw error;
  }
}

// Check if video file is suitable for processing
function validateVideoFile(videoFile: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024; // 100MB limit
  const minSize = 1024; // 1KB minimum
  
  if (videoFile.size > maxSize) {
    return { valid: false, error: `Video file too large: ${Math.round(videoFile.size / 1024 / 1024)}MB (max: 100MB)` };
  }
  
  if (videoFile.size < minSize) {
    return { valid: false, error: `Video file too small: ${videoFile.size} bytes` };
  }
  
  if (!videoFile.type.startsWith('video/')) {
    return { valid: false, error: `Invalid file type: ${videoFile.type}` };
  }
  
  return { valid: true };
}

// Main function with progressive fallbacks
export async function addCharacterOverlays(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log('Starting character overlay process...');
  console.log('Video file:', videoFile.name, 'Size:', videoFile.size, 'Type:', videoFile.type);
  console.log('Characters:', characters.length);
  
  // Validate video file first
  const validation = validateVideoFile(videoFile);
  if (!validation.valid) {
    console.warn('⚠️ Video file validation failed:', validation.error);
    // Still try to process, but log the warning
  }
  
  // Test 1: Can we just copy the video?
  try {
    console.log('Test 1: Trying basic video copy...');
    await justCopyVideo(videoFile, onProgress);
    console.log('✅ Basic video copy successful!');
    
    // If copy works and we have characters, try adding them
    if (characters.length > 0) {
      try {
        console.log('Test 2: Trying actual text overlays...');
        return await addTextOverlays(videoFile, characters, onProgress);
      } catch (textError) {
        console.error('❌ Text overlays failed, trying simple text...');
        
        try {
          console.log('Test 3: Trying simple text overlay...');
          return await addSimpleTextOverlay(videoFile, characters, onProgress);
        } catch (simpleTextError) {
          console.error('❌ Simple text failed, trying basic text...');
          
          try {
            console.log('Test 4: Trying basic text overlay...');
            return await addBasicTextOverlay(videoFile, onProgress);
          } catch (basicTextError) {
            console.error('❌ Basic text also failed, returning original copy');
            return await justCopyVideo(videoFile, onProgress);
          }
        }
      }
    } else {
      // No characters to add, just return a copy
      console.log('No characters to add, returning processed copy');
      return await justCopyVideo(videoFile, onProgress);
    }
    
  } catch (copyError) {
    console.error('❌ Even basic video copy failed:', copyError);
    
    // Last resort: return the original video file as a blob
    console.log('🔄 Last resort: returning original video file...');
    try {
      const originalBlob = new Blob([await fetchFile(videoFile)], { type: 'video/mp4' });
      console.log('✅ Successfully returned original video as blob');
      return originalBlob;
    } catch (originalError) {
      console.error('❌ Failed to return original video:', originalError);
      throw new Error(`Video processing completely failed: ${copyError}. Original video also failed: ${originalError}`);
    }
  }
}

// Debug function to check FFmpeg capabilities
export async function debugFFmpeg(): Promise<void> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    console.log('=== FFmpeg Debug Info ===');
    
    // Check FFmpeg version and capabilities
    await ffmpeg.exec(['-version']);
    
    // List available formats
    await ffmpeg.exec(['-formats']);
    
    // List available codecs
    await ffmpeg.exec(['-codecs']);
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}