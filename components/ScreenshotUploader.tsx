import React, { useRef, useEffect } from 'react';
import { ScreenIcon } from './IconComponents.tsx';

interface ScreenShareControlProps {
  stream: MediaStream | null;
  onStartShare: () => void;
  isRecording: boolean;
}

export const ScreenShareControl: React.FC<ScreenShareControlProps> = ({ stream, onStartShare, isRecording }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full h-full min-h-[200px] flex flex-col">
      <h2 className="text-lg font-semibold text-gray-300 mb-3">Screen Context</h2>
      <div
          className="relative flex flex-col items-center justify-center w-full flex-grow bg-black/20 rounded-xl border border-dashed border-white/20 overflow-hidden"
      >
          {stream ? (
              <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
              />
          ) : (
              <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-700/50 rounded-full">
                    <ScreenIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="mt-2 text-md font-semibold text-gray-200">Share your screen</p>
                  <p className="text-sm text-gray-400 mb-4">Provide context for the AI assistant</p>
                  <button
                      onClick={onStartShare}
                      className="px-5 py-2.5 bg-gray-600/50 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors duration-300 border border-white/20"
                  >
                      Start Sharing
                  </button>
              </div>
          )}
          {isRecording && stream && (
            <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                LIVE
            </div>
          )}
      </div>
    </div>
  );
};








// import React, { useRef, useEffect, useState } from 'react';
// import { ScreenIcon } from './IconComponents.tsx';

// interface ScreenShareControlProps {
//   stream: MediaStream | null;
//   onStartShare: () => void;
//   isRecording: boolean;
// }

// export const ScreenShareControl: React.FC<ScreenShareControlProps> = ({ 
//   stream, 
//   onStartShare, 
//   isRecording 
// }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [captureIndicator, setCaptureIndicator] = useState(false);
//   const [updateCount, setUpdateCount] = useState(0);

//   useEffect(() => {
//     if (videoRef.current && stream) {
//       videoRef.current.srcObject = stream;
//     }
//   }, [stream]);

//   // Visual indicator for screen capture every 4 seconds
//   useEffect(() => {
//     if (!isRecording) {
//       setUpdateCount(0);
//       return;
//     }

//     const interval = setInterval(() => {
//       setUpdateCount(prev => prev + 1);
//       setCaptureIndicator(true);
//       setTimeout(() => setCaptureIndicator(false), 400);
//     }, 4000); // Matches the capture interval

//     return () => clearInterval(interval);
//   }, [isRecording]);

//   return (
//     <div className="w-full h-full min-h-[200px] flex flex-col">
//       <h2 className="text-lg font-semibold text-gray-300 mb-3">Screen Context</h2>
//       <div
//         className="relative flex flex-col items-center justify-center w-full flex-grow bg-black/20 rounded-xl border border-dashed border-white/20 overflow-hidden"
//       >
//         {stream ? (
//           <>
//             <video
//               ref={videoRef}
//               autoPlay
//               muted
//               playsInline
//               className="w-full h-full object-contain"
//             />
            
//             {/* LIVE indicator */}
//             {isRecording && (
//               <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm z-10">
//                 <span className="relative flex h-3 w-3">
//                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//                   <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
//                 </span>
//                 <span className="text-white font-medium">LIVE</span>
//               </div>
//             )}

//             {/* AI Analyzing indicator with update count */}
//             {isRecording && (
//               <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
//                 <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs">
//                   <svg 
//                     className="w-4 h-4 text-green-400" 
//                     fill="none" 
//                     stroke="currentColor" 
//                     viewBox="0 0 24 24"
//                   >
//                     <path 
//                       strokeLinecap="round" 
//                       strokeLinejoin="round" 
//                       strokeWidth={2} 
//                       d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
//                     />
//                     <path 
//                       strokeLinecap="round" 
//                       strokeLinejoin="round" 
//                       strokeWidth={2} 
//                       d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
//                     />
//                   </svg>
//                   <span className="text-green-400 font-medium">AI Watching</span>
//                 </div>
//                 {updateCount > 0 && (
//                   <div className="flex items-center gap-1 bg-blue-600/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs self-end">
//                     <span className="text-white font-mono">{updateCount}</span>
//                     <span className="text-blue-100">updates sent</span>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Screen capture flash effect */}
//             {captureIndicator && (
//               <div className="absolute inset-0 bg-blue-400/30 animate-flash pointer-events-none border-2 border-blue-400" />
//             )}

//             {/* Bottom info bar when recording */}
//             {isRecording && (
//               <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-300 z-10">
//                 <div className="flex items-center justify-between">
//                   <span>📸 Capturing every 2.5s</span>
//                   <span className="text-green-400">✓ Screen context active</span>
//                 </div>
//               </div>
//             )}
//           </>
//         ) : (
//           <div className="text-center p-4">
//             <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-700/50 rounded-full">
//               <ScreenIcon className="w-8 h-8 text-gray-400" />
//             </div>
//             <p className="mt-2 text-md font-semibold text-gray-200">Share your screen</p>
//             <p className="text-sm text-gray-400 mb-4">Provide context for the AI assistant</p>
//             <button
//               onClick={onStartShare}
//               className="px-5 py-2.5 bg-gray-600/50 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors duration-300 border border-white/20"
//             >
//               Start Sharing
//             </button>
//           </div>
//         )}
//       </div>
      
//       {stream && !isRecording && (
//         <div className="mt-3 text-center">
//           <p className="text-xs text-gray-500">
//             Click the microphone button to start the conversation
//           </p>
//         </div>
//       )}
      
//       {stream && isRecording && (
//         <div className="mt-3 text-center">
//           <p className="text-xs text-green-400 flex items-center justify-center gap-2">
//             <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
//             Screen updates being sent to AI - works even in background tabs
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };