'use client';

import React, { useState } from 'react';
import VideoUploader from '@/components/VideoUploader';
import CharacterSelector from '@/components/CharacterSelector';
import VideoProcessor from '@/components/VideoProcessor';
import { FileVideo } from 'lucide-react';

export interface Character {
  id: number;
  type: string;
  emoji: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export default function Home() {
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <FileVideo className="w-10 h-10" />
            Video Text Overlay Studio
          </h1>
          <p className="text-blue-200">Upload a video and add custom text overlays!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <VideoUploader
              uploadedVideo={uploadedVideo}
              setUploadedVideo={setUploadedVideo}
              setVideoUrl={setVideoUrl}
              setCharacters={setCharacters}
            />
            
            <VideoProcessor
              videoUrl={videoUrl}
              characters={characters}
              setCharacters={setCharacters}
              uploadedVideo={uploadedVideo}
            />
          </div>

          <div className="space-y-6">
            <CharacterSelector
              characters={characters}
              setCharacters={setCharacters}
            />
          </div>
        </div>
      </div>
    </main>
  );
}