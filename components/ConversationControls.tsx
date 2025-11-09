// import React from 'react';
// import { MicIcon, StopCircleIcon, LoaderIcon, WaveformIcon } from './IconComponents.tsx';

// interface ConversationControlsProps {
//   isRecording: boolean;
//   isConnecting: boolean;
//   isScreenShared: boolean;
//   onStart: () => void;
//   onStop: () => void;
// }

// export const ConversationControls: React.FC<ConversationControlsProps> = ({
//   isRecording,
//   isConnecting,
//   isScreenShared,
//   onStart,
//   onStop,
// }) => {
//   const isDisabled = !isScreenShared || isConnecting;

//   let Icon = MicIcon;
//   let label = "Start Conversation";
//   let buttonClasses = "bg-blue-600/80 hover:bg-blue-600 border-blue-500/50";
  
//   if(isConnecting) {
//       Icon = LoaderIcon;
//       label = "Connecting...";
//       buttonClasses = "bg-gray-700/50 border-gray-600";
//   } else if (isRecording) {
//       Icon = WaveformIcon;
//       label = "Stop Conversation";
//       buttonClasses = "bg-red-600/80 hover:bg-red-600 border-red-500/50 animate-pulse-glow";
//   }

//   if (isDisabled && !isConnecting) {
//     buttonClasses = "bg-gray-800/50 border-gray-700 cursor-not-allowed";
//   }

//   return (
//     <div className="flex flex-col items-center justify-center py-4">
//       <button
//         onClick={isRecording ? onStop : onStart}
//         disabled={isDisabled}
//         aria-label={label}
//         className={`
//           w-24 h-24 rounded-full border
//           flex items-center justify-center
//           transition-all duration-300 ease-in-out transform
//           focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900
//           ${isDisabled && !isConnecting ? 'focus:ring-gray-600' : isRecording ? 'focus:ring-red-500/50' : 'focus:ring-blue-500/50'}
//           ${isDisabled ? '' : 'hover:scale-105'}
//           ${buttonClasses}
//         `}
//       >
//         <Icon className={`w-12 h-12 text-white ${isConnecting ? 'animate-spin' : ''}`} />
//       </button>
//        <p className={`mt-4 text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-300'}`}>
//         {isConnecting ? "Connecting..." : isRecording ? "Listening..." : isScreenShared ? "Ready to talk" : "Share screen first"}
//       </p>
//     </div>
//   );
// };









import React, { useState } from 'react';
import { MicIcon, StopCircleIcon, LoaderIcon, WaveformIcon } from './IconComponents.tsx';

interface ConversationControlsProps {
  isRecording: boolean;
  isConnecting: boolean;
  isScreenShared: boolean;
  onStart: () => void;
  onStop: () => void;
  onAskQuestion: (question: string) => void;
}


export const ConversationControls: React.FC<ConversationControlsProps> = ({
  isRecording,
  isConnecting,
  isScreenShared,
  onStart,
  onStop,
  onAskQuestion,
}) => {
  const isDisabled = !isScreenShared || isConnecting;
  const [question, setQuestion] = useState('');

  let Icon = MicIcon;
  let label = "Start Conversation";
  let buttonClasses = "bg-blue-600/80 hover:bg-blue-600 border-blue-500/50";
  
  if (isConnecting) {
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

  const handleAsk = () => {
  console.log('=== HANDLE ASK CLICKED ===');
  console.log('Question:', question);
  console.log('question.trim():', question.trim());
  if (question.trim()) {
    console.log('Calling onAskQuestion...');
    onAskQuestion(question);
    setQuestion('');
  } else {
    console.log('Question is empty, not calling onAskQuestion');
  }
};

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
      {isRecording && (
        <div className="mt-4 w-full max-w-xs">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the screen..."
            className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={!isScreenShared || isConnecting}
          />
          <button
            onClick={handleAsk}
            disabled={!question.trim() || !isScreenShared || isConnecting}
            className="mt-2 w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white font-semibold transition-colors duration-300 border border-blue-500/50 disabled:bg-gray-800/50 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </div>
      )}
    </div>
  );
};