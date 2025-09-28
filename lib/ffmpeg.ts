// lib/ffmpeg.ts - Updated with font support
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let fontsLoaded = false;

export interface Character {
  text?: string;
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
  
  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    // Load FFmpeg WASM with proper URLs
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
}

// Load fonts into FFmpeg filesystem
export async function loadFonts(): Promise<void> {
  if (fontsLoaded) return;
  
  const ffmpeg = await loadFFmpeg();
  
  try {
    
    // Option 1: Load local Roboto Condensed font
    try {
      const robotoUrl = '/fonts/Roboto_Condensed-Regular.ttf';
      const robotoResponse = await fetch(robotoUrl);
      if (robotoResponse.ok) {
        const robotoData = await robotoResponse.arrayBuffer();
        await ffmpeg.writeFile('roboto.ttf', new Uint8Array(robotoData));
      }
    } catch (error) {
      console.warn('⚠️ Failed to load local Roboto font:', error);
    }
    
    // Option 2: Load a basic TrueType font (fallback)
    // try {
    //   const liberationUrl = 'https://github.com/liberationfonts/liberation-fonts/raw/master/liberation-fonts-ttf-2.1.5/LiberationSans-Regular.ttf';
    //   const liberationResponse = await fetch(liberationUrl);
    //   if (liberationResponse.ok) {
    //     const liberationData = await liberationResponse.arrayBuffer();
    //     await ffmpeg.writeFile('liberation.ttf', new Uint8Array(liberationData));
    //   }
    // } catch (error) {
    //   console.warn('⚠️ Failed to load Liberation font:', error);
    // }
    
    fontsLoaded = true;
    
  } catch (error) {
    console.error('❌ Font loading failed:', error);
    // Don't throw - we can still try text without custom fonts
  }
}

// Method: Add text overlays with proper font support
export async function addTextOverlaysWithFont(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    
    // Load fonts first
    await loadFonts();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Write input video file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Video dimensions (from your logs: 1080x1920)
    const videoWidth = 1080;
    const videoHeight = 1920;
    
    // Create text overlay filters
    const filterParts: string[] = [];
    
    characters.forEach((char) => {
      // Convert percentage to actual pixels
      const x = Math.max(20, Math.min(videoWidth - 200, Math.round((char.x / 100) * videoWidth)));
      const y = Math.max(30, Math.min(videoHeight - 60, Math.round((char.y / 100) * videoHeight)));
      const fontSize = Math.max(16, Math.min(72, Math.round(28 * char.scale)));
      
      // Get the text to display
      const textToDisplay = char.text || char.emoji || 'TEXT';
      
      // Escape special characters for FFmpeg
      const escapedText = textToDisplay
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, "\\:")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]");
      
      
      // Use TTF font files (FFmpeg WASM doesn't support WOFF2)
      const fontFile = ':fontfile=roboto.ttf';  // Default to roboto.ttf
      
      
      // Create drawtext filter with font and styling
      const drawTextFilter = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=white:bordercolor=black:borderw=2${fontFile}`;
      
      filterParts.push(drawTextFilter);
    });
    
    const filterString = filterParts.join(',');
    
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
    console.error('Error in text overlays with font:', error);
    throw error;
  }
}

// Simplified text overlay without custom fonts (most reliable)
export async function addSimpleTextOverlay(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Use only the first character for simplicity
    const char = characters[0];
    if (!char) {
      throw new Error('No characters provided');
    }
    
    const textToDisplay = char.text || char.emoji || 'TEXT';
    const x = Math.round((char.x / 100) * 1080);
    const y = Math.round((char.y / 100) * 1920);
    
    // Escape text for FFmpeg
    const escapedText = textToDisplay.replace(/'/g, "\\'").replace(/:/g, "\\:");
    
    
    // Use the absolute simplest drawtext command
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=32:fontcolor=yellow`,
      '-c:a', 'copy',
      '-preset', 'ultrafast',
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

// Canvas-based text overlay (alternative approach)
export async function addCanvasTextOverlay(
  videoFile: File,
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  
  try {
    // Create text images using canvas
    const textImages: Blob[] = [];
    
    for (const char of characters) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size
      canvas.width = 400;
      canvas.height = 100;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Style text
      const fontSize = Math.round(28 * char.scale);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const text = char.text || char.emoji || 'TEXT';
      
      // Draw text with stroke (outline)
      ctx.strokeText(text, canvas.width/2, canvas.height/2);
      ctx.fillText(text, canvas.width/2, canvas.height/2);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      textImages.push(blob);
    }
    
    // For now, just return the original video
    // In a full implementation, you'd overlay these images
    
    // Fallback to simple copy
    return await justCopyVideo(videoFile, onProgress);
    
  } catch (error) {
    console.error('Canvas text overlay failed:', error);
    throw error;
  }
}

// Safe video copy
export async function justCopyVideo(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      '-crf', '23',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
    return new Blob([uint8Array as BlobPart], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('Error in video copy:', error);
    throw error;
  }
}

// Main function with font-aware fallbacks
export async function addCharacterOverlays(
  videoFile: File, 
  characters: Character[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  
  if (characters.length === 0) {
    return await justCopyVideo(videoFile, onProgress);
  }
  
  // Try methods in order of preference
  const methods = [
    { name: 'Text overlays with fonts', fn: addTextOverlaysWithFont, needsCharacters: true },
    { name: 'Simple text overlay', fn: addSimpleTextOverlay, needsCharacters: true },
    { name: 'Canvas-based overlay', fn: addCanvasTextOverlay, needsCharacters: true },
    { name: 'Safe video copy', fn: justCopyVideo, needsCharacters: false }
  ];
  
  for (const method of methods) {
    try {
      let result: Blob;
      if (method.needsCharacters) {
        result = await (method.fn as (videoFile: File, characters: Character[], onProgress?: (progress: number) => void) => Promise<Blob>)(videoFile, characters, onProgress);
      } else {
        result = await (method.fn as (videoFile: File, onProgress?: (progress: number) => void) => Promise<Blob>)(videoFile, onProgress);
      }
      
      // Check if the result is valid (not empty)
      if (result.size === 0) {
        console.error(`❌ ${method.name} produced empty result, trying next method...`);
        continue;
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed: ${method.name}`, error);
      continue;
    }
  }
  
  throw new Error('All text overlay methods failed');
}

// Debug function
export async function debugFFmpeg(): Promise<void> {
  const ffmpeg = await loadFFmpeg();
  
  try {
    await ffmpeg.exec(['-version']);
    await ffmpeg.exec(['-formats']);
  } catch (error) {
    console.error('Debug failed:', error);
  }
}