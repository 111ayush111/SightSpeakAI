import React, { useState, useEffect } from 'react';
import { useSightSpeak } from './hooks/useSightSpeak.ts';
import { ScreenShareControl } from './components/ScreenshotUploader.tsx';
import { ConversationControls } from './components/ConversationControls.tsx';
import { TranscriptDisplay } from './components/TranscriptDisplay.tsx';

const App: React.FC = () => {
  const {
    screenStream,
    isConnecting,
    isRecording,
    transcript,
    error,
    startScreenShare,
    startSession,
    stopSession,
  } = useSightSpeak();

  const [isLocalFile, setIsLocalFile] = useState(false);

  useEffect(() => {
    if (window.location.protocol === 'file:') {
      setIsLocalFile(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 font-['Inter',_sans-serif]">
      <div className="w-full max-w-4xl mx-auto bg-black/30 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <header className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SightSpeak AI</h1>
            <p className="text-gray-400 mt-1">Your context-aware voice assistant</p>
          </div>
        </header>

        <main className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            {isLocalFile && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-4 rounded-lg">
                <h3 className="font-bold">Local Environment Notice</h3>
                <p className="mt-2 text-sm">
                  This app is running from a local file path (<code>file://</code>). For full functionality, it must be served by a web server.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Easy Fix:</strong> If you have Node.js, run <code>npx serve</code> in the project folder and open the provided URL.
                </p>
              </div>
            )}

            <ScreenShareControl
              stream={screenStream}
              onStartShare={startScreenShare}
              isRecording={isRecording}
            />
            
            <ConversationControls
              isRecording={isRecording}
              isConnecting={isConnecting}
              isScreenShared={!!screenStream}
              onStart={startSession}
              onStop={stopSession}
            />
          </div>

          <div className="bg-black/20 p-4 rounded-xl border border-white/10 flex flex-col h-[500px]">
            <TranscriptDisplay transcript={transcript} isConnecting={isConnecting} isRecording={isRecording} />
          </div>

        </main>
        
        {error && (
            <div className="border-t border-white/10 bg-red-500/10 text-red-300 p-4 text-center text-sm">
              <p>
                <strong>Error:</strong> {error}
              </p>
            </div>
        )}
      </div>
       <footer className="text-center mt-8 text-gray-400 text-sm">
          <p>Click "Share Screen", then press the microphone button to start a conversation.</p>
      </footer>
    </div>
  );
};

export default App;