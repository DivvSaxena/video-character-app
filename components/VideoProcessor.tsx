'use client';

import React, { useRef, useState } from 'react';
import { Play, Download, Loader2, AlertCircle, Bug } from 'lucide-react';
import { Character } from '@/app/page';
import { useFFmpeg } from '@/hooks/useFFmpeg';
import { addCharacterOverlays, debugFFmpeg } from '@/lib/ffmpeg';

interface VideoProcessorProps {
  videoUrl: string;
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  uploadedVideo: File | null;
}

export default function VideoProcessor({ 
  videoUrl, 
  characters, 
  setCharacters, 
  uploadedVideo 
}: VideoProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [draggingCharacter, setDraggingCharacter] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const { isLoaded, isLoading, error: ffmpegError } = useFFmpeg();

  // Helper function to calculate video content area and offsets
  const getVideoContentArea = () => {
    if (!videoRef.current) return null;
    
    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    
    const videoAspectRatio = videoWidth / videoHeight;
    const elementAspectRatio = elementWidth / elementHeight;
    
    let contentWidth, contentHeight, offsetX, offsetY;
    
    if (videoAspectRatio > elementAspectRatio) {
      // Video is wider than element - letterboxing on top/bottom
      contentWidth = elementWidth;
      contentHeight = elementWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (elementHeight - contentHeight) / 2;
    } else {
      // Video is taller than element - letterboxing on left/right
      contentHeight = elementHeight;
      contentWidth = elementHeight * videoAspectRatio;
      offsetX = (elementWidth - contentWidth) / 2;
      offsetY = 0;
    }
    
    return { contentWidth, contentHeight, offsetX, offsetY, rect };
  };

  const addCharacter = (event: React.MouseEvent<HTMLVideoElement>) => {
    const contentArea = getVideoContentArea();
    if (!contentArea) return;
    
    const { contentWidth, contentHeight, offsetX, offsetY, rect } = contentArea;
    
    // Calculate position relative to actual video content
    const relativeX = event.clientX - rect.left - offsetX;
    const relativeY = event.clientY - rect.top - offsetY;
    
    // Convert to percentage of actual video content
    const marginX = 5; // 5% margin from edges
    const marginY = 5; // 5% margin from edges
    const x = Math.max(marginX, Math.min(100 - marginX, (relativeX / contentWidth) * 100));
    const y = Math.max(marginY, Math.min(100 - marginY, (relativeY / contentHeight) * 100));
    
    // Prompt user for text input
    const text = prompt('Enter text to add to the video:');
    if (text && text.trim()) {
      const newCharacter: Character = {
        id: Date.now(),
        type: 'custom',
        emoji: text.trim(),
        x: x,
        y: y,
        scale: 1,
        rotation: 0
      };
      
      setCharacters([...characters, newCharacter]);
    }
  };

  const removeCharacter = (id: number) => {
    setCharacters(characters.filter(char => char.id !== id));
  };

  const startEditingCharacter = (character: Character) => {
    setEditingCharacter(character.id);
    setEditText(character.text || character.emoji);
  };

  const saveCharacterEdit = () => {
    if (editingCharacter && editText.trim()) {
      setCharacters(characters.map(char => 
        char.id === editingCharacter 
          ? { ...char, text: editText.trim() }
          : char
      ));
      setEditingCharacter(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingCharacter(null);
    setEditText('');
  };

  const handleMouseDown = (e: React.MouseEvent, characterId: number) => {
    e.stopPropagation();
    setDraggingCharacter(characterId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCharacter || !dragStart) return;
    
    const contentArea = getVideoContentArea();
    if (!contentArea) return;
    
    const { contentWidth, contentHeight, offsetX, offsetY, rect } = contentArea;
    
    // Calculate position relative to actual video content
    const relativeX = e.clientX - rect.left - offsetX;
    const relativeY = e.clientY - rect.top - offsetY;
    
    // Convert to percentage of actual video content
    const marginX = 5; // 5% margin from edges
    const marginY = 5; // 5% margin from edges
    const newX = Math.max(marginX, Math.min(100 - marginX, (relativeX / contentWidth) * 100));
    const newY = Math.max(marginY, Math.min(100 - marginY, (relativeY / contentHeight) * 100));
    
    setCharacters(characters.map(c => 
      c.id === draggingCharacter 
        ? { ...c, x: newX, y: newY }
        : c
    ));
  };

  const handleMouseUp = () => {
    setDraggingCharacter(null);
    setDragStart(null);
  };

  const runDebug = async () => {
    if (!isLoaded) {
      alert('FFmpeg not loaded yet');
      return;
    }
    
    setIsDebugging(true);
    try {
      await debugFFmpeg();
    } catch (error) {
      console.error('Debug failed:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  const processVideo = async () => {
    if (!isLoaded || !uploadedVideo) {
      alert('Please ensure FFmpeg is loaded and video is uploaded');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);
    
    try {
      const processedBlob = await addCharacterOverlays(
        uploadedVideo, 
        characters,
        (progress) => {
          setProcessingProgress(progress * 100);
        }
      );
      
      // Clean up any existing blob URL
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl);
      }
      
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedVideoUrl(processedUrl);
      
      // Check if we got a valid blob
      if (processedBlob.size === 0) {
        throw new Error('Video processing produced empty result');
      }
      
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const downloadProcessedVideo = () => {
    if (processedVideoUrl) {
      const a = document.createElement('a');
      a.href = processedVideoUrl;
      a.download = 'processed-video-with-characters.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!videoUrl) return null;

  return (
    <>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Video Preview</h3>
        <div className="relative">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full rounded-lg cursor-crosshair"
            onClick={addCharacter}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {characters.map((character) => {
            const contentArea = getVideoContentArea();
            if (!contentArea) return null;
            
            const { contentWidth, contentHeight, offsetX, offsetY, rect } = contentArea;
            
            // Convert percentage to actual pixels within the video content area
            const actualX = (character.x / 100) * contentWidth + offsetX;
            const actualY = (character.y / 100) * contentHeight + offsetY;
            
            // Convert to percentage of the video element
            const elementX = (actualX / rect.width) * 100;
            const elementY = (actualY / rect.height) * 100;
            
            return (
              <div
                key={character.id}
                className="absolute cursor-pointer hover:scale-110 transition-transform group"
                style={{
                  left: `${elementX}%`,
                  top: `${elementY}%`,
                  transform: `translate(-50%, -50%) scale(${character.scale}) rotate(${character.rotation}deg)`,
                  fontSize: '2rem'
                }}
              >
              {editingCharacter === character.id ? (
                <div className="bg-black/80 p-2 rounded-lg">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1 w-32"
                    placeholder="Enter text..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCharacterEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={saveCharacterEdit}
                      className="text-green-400 text-xs hover:text-green-300"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-red-400 text-xs hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onMouseDown={(e) => handleMouseDown(e, character.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCharacter(character.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditingCharacter(character);
                  }}
                  className={`relative bg-black/70 text-white px-2 py-1 rounded border border-white/30 ${
                    draggingCharacter === character.id ? 'cursor-grabbing' : 'cursor-grab'
                  } ${
                    (character.x <= 7 || character.x >= 93 || character.y <= 7 || character.y >= 93) 
                      ? 'border-yellow-400' : 'border-white/30'
                  }`}
                  style={{ fontSize: '0.9rem' }}
                >
                  {character.text || character.emoji}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Drag to move • Double-click to edit • Click to remove
                    {(character.x <= 7 || character.x >= 93 || character.y <= 7 || character.y >= 93) && (
                      <div className="text-yellow-300 mt-1">⚠️ Near video edge</div>
                    )}
                  </div>
                </div>
              )}
              </div>
            );
          })}
          
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Click on video content to add text • Drag to move • Double-click to edit
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Process Video</h3>
        
        {/* FFmpeg Status */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            isLoaded ? 'bg-green-400' : 
            isLoading ? 'bg-yellow-400' : 
            ffmpegError ? 'bg-red-400' : 'bg-gray-400'
          }`}></div>
          <span className="text-blue-200">
            FFmpeg Status: {
              isLoaded ? 'Ready' : 
              isLoading ? 'Loading...' : 
              ffmpegError ? `Error: ${ffmpegError}` : 'Not loaded'
            }
          </span>
        </div>

        {/* Debug Button */}
        {/* <div className="mb-4">
          <button
            onClick={runDebug}
            disabled={!isLoaded || isDebugging}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2"
          >
            {isDebugging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Debug...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4" />
                Debug FFmpeg
              </>
            )}
          </button>
        </div> */}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-red-200 text-sm">
              <div className="font-medium">Processing Error:</div>
              <div>{error}</div>
              <div className="mt-1 text-xs opacity-75">Check console for detailed logs</div>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-200 mb-1">
              <span>Processing video... (check console for details)</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <button
          onClick={processVideo}
          disabled={!isLoaded || !uploadedVideo || isProcessing}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 mb-4"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing... {Math.round(processingProgress)}%
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              {characters.length > 0 ? 'Add Character Overlays' : 'Process Video'}
            </>
          )}
        </button>

        {processedVideoUrl && (
          <div className="space-y-3">
            <div className="text-green-400 text-sm font-medium">✅ Video processed successfully!</div>
            <video 
              src={processedVideoUrl} 
              controls 
              className="w-full rounded-lg"
            />
            <button
              onClick={downloadProcessedVideo}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Processed Video
            </button>
          </div>
        )}
        
        {/* Info Box */}
    <div className="p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
      <div className="text-blue-200 text-sm">
        <div className="font-medium mb-1">Current Status:</div>
        Based on your video (1088x1920), the app will try:
        <div className="mt-1 text-xs">
          1. Text overlays with system fonts<br/>
          2. Simple text overlay (yellow text)<br/>  
          3. Canvas-based text overlay<br/>
          4. Safe video copy (fallback)
        </div>
        <div className="mt-2 text-xs text-yellow-300">
          💡 If you get memory errors, try a smaller video file (&lt;50MB)
        </div>
      </div>
    </div>
      </div>
    </>
  );
}
