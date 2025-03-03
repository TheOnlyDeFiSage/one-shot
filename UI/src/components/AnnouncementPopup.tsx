import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface AnnouncementPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementPopup({ isOpen, onClose }: AnnouncementPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 max-w-xl rounded-2xl border border-white/10 shadow-2xl p-6 mx-4 animate-slide-up">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <AlertCircle className="text-primary mr-2 h-6 w-6" />
            <h2 className="text-xl font-bold text-white">Important Announcement</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="prose prose-invert max-w-none mb-4">
          <p className="text-gray-300 mb-4">
            Hey everyone, it's <span className="text-primary font-semibold"><a href="https://x.com/DeFi_Sage" target="_blank" rel="noopener noreferrer">@DeFi_Sage</a></span> here. Just wanted to give you a heads-up that I'm in the process of restructuring all the smart contracts and planning to add new features as we go. Starting from scratch like this will help me scale the project properly and tackle any security concerns early on.
          </p>
          
          <p className="text-gray-300 mb-4">
            Going forward, the project will just be called <span className="text-primary font-semibold">One-Shot</span>, and it'll primarily run on chains with Chainlink access or native VRF support, like Supra Labs.
          </p>
          
          <p className="text-gray-300">
            I won't be updating this current version anymore since my focus is shifting to the new contracts. Appreciate your time trying this out, and keep an eye on my <span className="text-primary font-semibold"><a href="https://x.com/DeFi_Sage" target="_blank" rel="noopener noreferrer">Twitter</a></span> for updates!
          </p>
        </div>
        
        <div className="flex justify-end mt-6">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full hover:from-secondary hover:to-primary transition-all duration-300 shadow-[0_4px_14px_rgba(0,255,178,0.3)]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
} 