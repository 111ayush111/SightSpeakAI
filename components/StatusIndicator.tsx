import React from 'react';

interface StatusIndicatorProps {
  isConnecting: boolean;
  isRecording: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnecting, isRecording }) => {
  let statusText = 'Idle';
  let dotClass = 'bg-gray-500';

  if (isConnecting) {
    statusText = 'Connecting';
    dotClass = 'bg-yellow-400 animate-pulse';
  } else if (isRecording) {
    statusText = 'Listening';
    dotClass = 'bg-green-400 animate-pulse';
  }

  return (
    <div className="flex items-center" title={statusText}>
      <div className={`w-2.5 h-2.5 rounded-full transition-colors ${dotClass}`}></div>
    </div>
  );
};