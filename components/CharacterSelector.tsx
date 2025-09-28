'use client';

import React, { useState } from 'react';
import { Type, Plus } from 'lucide-react';
import { Character } from '@/app/page';

interface CharacterSelectorProps {
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
}

export default function CharacterSelector({ 
  characters, 
  setCharacters 
}: CharacterSelectorProps) {
  
  const [customText, setCustomText] = useState('');

  const addCustomText = () => {
    if (customText.trim()) {
      const newCharacter: Character = {
        id: Date.now(),
        type: 'custom',
        emoji: customText.trim(),
        x: 50, // Default position
        y: 50,
        scale: 1,
        rotation: 0
      };
      setCharacters([...characters, newCharacter]);
      setCustomText('');
    }
  };

  const removeCharacter = (id: number) => {
    setCharacters(characters.filter(char => char.id !== id));
  };

  const updateCharacter = (id: number, updates: Partial<Character>) => {
    setCharacters(characters.map(char => {
      if (char.id === id) {
        const updatedChar = { ...char, ...updates };
        
        // Ensure position stays within video boundaries with margin to prevent text cutoff
        const margin = 5; // 5% margin from edges
        if (updates.x !== undefined) {
          updatedChar.x = Math.max(margin, Math.min(100 - margin, updates.x));
        }
        if (updates.y !== undefined) {
          updatedChar.y = Math.max(margin, Math.min(100 - margin, updates.y));
        }
        
        return updatedChar;
      }
      return char;
    }));
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Type className="w-5 h-5" />
          Add Text Overlay
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-blue-200 text-sm block mb-2">
              Enter text to add to your video:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter your text here..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addCustomText();
                  }
                }}
              />
              <button
                onClick={addCustomText}
                disabled={!customText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            💡 Tip: Click on the video preview to position your text overlays
          </div>
        </div>
      </div>

      {characters.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Added Text Overlays ({characters.length})</h3>
          <div className="space-y-3">
            {characters.map((character) => (
              <div key={character.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white flex items-center gap-2">
                    <span className="text-sm bg-blue-500/20 px-2 py-1 rounded">{character.emoji}</span>
                    Text Overlay
                  </span>
                  <button
                    onClick={() => removeCharacter(character.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 py-1 bg-red-500/20 rounded"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-blue-200 block">X Position</label>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="1"
                      value={character.x}
                      onChange={(e) => updateCharacter(character.id, { x: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{character.x}%</div>
                  </div>
                  <div>
                    <label className="text-blue-200 block">Y Position</label>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="1"
                      value={character.y}
                      onChange={(e) => updateCharacter(character.id, { y: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{character.y}%</div>
                  </div>
                  <div>
                    <label className="text-blue-200 block">Scale</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={character.scale}
                      onChange={(e) => updateCharacter(character.id, { scale: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{character.scale}x</div>
                  </div>
                  <div>
                    <label className="text-blue-200 block">Rotation</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={character.rotation}
                      onChange={(e) => updateCharacter(character.id, { rotation: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{character.rotation}°</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}