import React from 'react';
import { MicIcon, StopCircleIcon, LoaderIcon, WaveformIcon } from './IconComponents.tsx';

interface ConversationControlsProps {
  isRecording: boolean;
  isConnecting: boolean;
  isScreenShared: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({
  isRecording,
  isConnecting,
  isScreenShared,
  onStart,
  onStop,
}) => {
  const isDisabled = !isScreenShared || isConnecting;

  let Icon = MicIcon;
  let label = "Start Conversation";
  let buttonClasses = "bg-blue-600/80 hover:bg-blue-600 border-blue-500/50";
  
  if(isConnecting) {
      Icon = LoaderIcon;
      label = "Connecting...";
      buttonClasses = "bg-gray-700/50 border-gray-600";
  } else if (isRecording) {
      Icon = WaveformIcon;
      label = "Stop Conversation";
      buttonClasses = "bg-red-600/80 hover:bg-red-600 border-red-500/50 animate-pulse-glow";
  }

  if (isDisabled && !isConnecting) {
    buttonClasses = "bg-gray-800/50 border-gray-700 cursor-not-allowed";
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={isDisabled}
        aria-label={label}
        className={`
          w-24 h-24 rounded-full border
          flex items-center justify-center
          transition-all duration-300 ease-in-out transform
          focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900
          ${isDisabled && !isConnecting ? 'focus:ring-gray-600' : isRecording ? 'focus:ring-red-500/50' : 'focus:ring-blue-500/50'}
          ${isDisabled ? '' : 'hover:scale-105'}
          ${buttonClasses}
        `}
      >
        <Icon className={`w-12 h-12 text-white ${isConnecting ? 'animate-spin' : ''}`} />
      </button>
       <p className={`mt-4 text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-300'}`}>
        {isConnecting ? "Connecting..." : isRecording ? "Listening..." : isScreenShared ? "Ready to talk" : "Share screen first"}
      </p>
    </div>
  );
};