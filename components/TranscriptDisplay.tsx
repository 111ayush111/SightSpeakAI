import React, { useRef, useEffect } from 'react';
import type { TranscriptMessage } from '../types.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface TranscriptDisplayProps {
  transcript: TranscriptMessage[];
  isConnecting: boolean;
  isRecording: boolean;
}

const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
    const isUser = message.speaker === 'user';
    const bubbleClasses = isUser
      ? 'bg-gradient-to-br from-blue-600 to-blue-800 self-end'
      : 'bg-gradient-to-br from-gray-700 to-gray-800 self-start';
    const textColor = message.isFinal ? 'text-gray-100' : 'text-gray-400 italic';
  
    return (
      <div className={`max-w-xl w-fit p-3.5 rounded-2xl ${bubbleClasses} animate-fade-in-up shadow-md`}>
        <p className={`text-base ${textColor}`}>
          {message.text}
        </p>
      </div>
    );
};

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript, isConnecting, isRecording }) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    return (
        <>
            <div className="flex-shrink-0 mb-3 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-300">Conversation</h2>
                <StatusIndicator isConnecting={isConnecting} isRecording={isRecording} />
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 flex flex-col">
                {transcript.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="text-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <p className="mt-4 text-gray-400">
                                {isRecording ? "Listening for your question..." : "Start a conversation to see the transcript."}
                            </p>
                        </div>
                    </div>
                ) : (
                    transcript.map((msg, index) => <MessageBubble key={index} message={msg} />)
                )}
                <div ref={endOfMessagesRef} />
            </div>
        </>
    );
};