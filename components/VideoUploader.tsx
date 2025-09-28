'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileVideo } from 'lucide-react';
import { Character } from '@/app/page';

interface VideoUploaderProps {
  uploadedVideo: File | null;
  setUploadedVideo: (file: File | null) => void;
  setVideoUrl: (url: string) => void;
  setCharacters: (characters: Character[]) => void;
}

export default function VideoUploader({ 
  uploadedVideo, 
  setUploadedVideo, 
  setVideoUrl, 
  setCharacters 
}: VideoUploaderProps) {
  const [ffmpegLoaded, setFFmpegLoaded] = useState(false);

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        // Simulate FFmpeg loading - replace with actual FFmpeg loading
        await new Promise(resolve => setTimeout(resolve, 2000));
        setFFmpegLoaded(true);
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
      }
    };
    loadFFmpeg();
  }, []);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        if (video.duration > 12) {
          alert('Please upload a video that is 10 seconds or less');
          return;
        }
        setUploadedVideo(file);
        setVideoUrl(URL.createObjectURL(file));
        setCharacters([]);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Upload Video
      </h2>
      
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
          id="video-upload"
        />
        <label 
          htmlFor="video-upload"
          className="cursor-pointer flex flex-col items-center gap-3 text-blue-200 hover:text-white transition-colors"
        >
          <FileVideo className="w-12 h-12" />
          <span className="text-lg font-medium">
            {uploadedVideo ? uploadedVideo.name : 'Click to upload video (max 10s)'}
          </span>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-blue-200">
        <div className={`w-2 h-2 rounded-full ${ffmpegLoaded ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
        FFmpeg Status: {ffmpegLoaded ? 'Ready' : 'Loading...'}
      </div>
    </div>
  );
}