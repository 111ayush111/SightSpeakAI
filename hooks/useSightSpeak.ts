
// import { useState, useRef, useCallback, useEffect } from 'react';
// // Fix: Removed non-exported 'LiveSession' type from @google/genai import.
// import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
// import type { TranscriptMessage } from '../types.ts';
// import { audioUtils } from '../services/audioUtils.ts';

// const API_KEY = 'AIzaSyDeiFk7FPoMbDxvGD3cplDMUhd2Ae9HBck';

// export const useSightSpeak = () => {
//   const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const ai = useRef<GoogleGenAI | null>(null);
//   // Fix: Used 'any' for the session promise type as 'LiveSession' is not exported from the library.
//   const sessionPromise = useRef<Promise<any> | null>(null);
//   const inputAudioContext = useRef<AudioContext | null>(null);
//   const outputAudioContext = useRef<AudioContext | null>(null);
//   const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
//   const micStream = useRef<MediaStream | null>(null);
//   const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  
//   const currentInputTranscription = useRef('');
//   const currentOutputTranscription = useRef('');
//   const nextStartTime = useRef(0);
//   const audioSources = useRef(new Set<AudioBufferSourceNode>());

//   useEffect(() => {
//     if (API_KEY) {
//       ai.current = new GoogleGenAI({ apiKey: API_KEY });
//     } else {
//       setError("API key is missing. Please provide a valid Google AI API key.");
//     }
//   }, []);
  
//   const stopScreenShare = useCallback(() => {
//     if (screenStream) {
//       screenStream.getTracks().forEach(track => track.stop());
//       setScreenStream(null);
//     }
//   }, [screenStream]);


//   const cleanup = useCallback(() => {
//       if (micStream.current) {
//         micStream.current.getTracks().forEach(track => track.stop());
//         micStream.current = null;
//       }
//       if (scriptProcessor.current) {
//         scriptProcessor.current.disconnect();
//         scriptProcessor.current = null;
//       }
//       if (mediaStreamSource.current) {
//         mediaStreamSource.current.disconnect();
//         mediaStreamSource.current = null;
//       }
//       if(inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
//         inputAudioContext.current.close();
//       }
//       if(outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//         outputAudioContext.current.close();
//       }
      
//       for (const source of audioSources.current.values()) {
//         source.stop();
//       }
//       audioSources.current.clear();
//       nextStartTime.current = 0;
      
//       setIsConnecting(false);
//       setIsRecording(false);
//   }, []);

//   const stopSession = useCallback(async () => {
//     if (sessionPromise.current) {
//       try {
//         const session = await sessionPromise.current;
//         session.close();
//       } catch (e) {
//         console.error("Error closing session:", e);
//       } finally {
//         sessionPromise.current = null;
//       }
//     }
//     cleanup();
//   }, [cleanup]);

//   const startScreenShare = useCallback(async () => {
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
//       setError("Screen sharing is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.");
//       return;
//     }
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: { cursor: "always" } as any,
//         audio: false,
//       });

//       const videoTracks = stream.getVideoTracks();
//       if (!videoTracks || videoTracks.length === 0) {
//         setError("Failed to get a video track from the screen share. The selected source might not have video.");
//         return;
//       }

//       // When the user stops sharing via the browser UI
//       videoTracks[0].addEventListener('ended', () => {
//         setScreenStream(null);
//         if (isRecording) {
//             stopSession();
//         }
//       });
//       setScreenStream(stream);
//       setError(null); // Clear previous errors
//     } catch (err) {
//       let message = 'An unknown error occurred.';
//       if (err instanceof Error) {
//         if (err.name === 'NotAllowedError') {
//           message = 'Permission to share screen was denied. Please try again and grant permission.';
//         } else {
//           message = err.message;
//         }
//       }
//       setError(`Could not start screen share: ${message}`);
//     }
//   }, [isRecording, stopSession]);
  

//   const startSession = useCallback(async () => {
//     if (!screenStream) {
//       setError("Please share your screen first.");
//       return;
//     }
//     if (!ai.current) {
//         setError("AI client not initialized.");
//         return;
//     }

//     setError(null);
//     setIsConnecting(true);
//     setTranscript([]);

//     // Capture a frame from the screen stream for context
//     let contextImageBase64: string;
//     try {
//         const videoTracks = screenStream.getVideoTracks();
//         if (!videoTracks || videoTracks.length === 0) {
//             throw new Error("No video track found in the shared screen stream.");
//         }
//         const track = videoTracks[0];

//         // Use a video element to capture a frame for better browser compatibility
//         const video = document.createElement('video');
//         // Make it invisible but part of the DOM to help with playback policies
//         video.style.position = 'fixed';
//         video.style.top = '-1000px';
//         video.style.visibility = 'hidden';
//         document.body.appendChild(video);

//         try {
//             video.srcObject = new MediaStream([track.clone()]);
//             video.muted = true;
            
//             contextImageBase64 = await new Promise<string>((resolve, reject) => {
//                 const cleanupListeners = () => {
//                     video.onplaying = null;
//                     video.onerror = null;
//                     clearTimeout(timeoutId);
//                 };

//                 const timeoutId = setTimeout(() => {
//                     cleanupListeners();
//                     reject(new Error("Timed out waiting for video to play."));
//                 }, 5000);

//                 video.onplaying = () => {
//                     cleanupListeners();
//                     // Use requestAnimationFrame to ensure the frame is painted before capture
//                     requestAnimationFrame(() => {
//                         try {
//                             const canvas = document.createElement('canvas');
//                             canvas.width = video.videoWidth;
//                             canvas.height = video.videoHeight;
                            
//                             if (canvas.width === 0 || canvas.height === 0) {
//                                 return reject(new Error('Video has no dimensions. Is the shared window minimized?'));
//                             }

//                             const context = canvas.getContext('2d');
//                             if (!context) {
//                                 return reject(new Error('Could not create 2D canvas context.'));
//                             }
//                             context.drawImage(video, 0, 0, canvas.width, canvas.height);
//                             resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
//                         } catch (e) {
//                             reject(e);
//                         }
//                     });
//                 };

//                 video.onerror = () => {
//                     cleanupListeners();
//                     reject(new Error("Video element encountered an error."));
//                 };

//                 video.play().catch(e => {
//                     cleanupListeners();
//                     reject(e);
//                 });
//             });
//         } finally {
//             // Cleanup video element and stream
//             if (video.srcObject) {
//                 const mediaStream = video.srcObject as MediaStream;
//                 mediaStream.getTracks().forEach(t => t.stop());
//             }
//             video.srcObject = null;
//             video.remove();
//         }
//     } catch (err) {
//         setError(`Failed to capture screen frame: ${err instanceof Error ? err.message : String(err)}`);
//         setIsConnecting(false);
//         return;
//     }
    
//     // Fix: Cast window to `any` to allow `webkitAudioContext` for older browser compatibility, resolving TypeScript errors.
//     inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
//     outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

//     sessionPromise.current = ai.current.live.connect({
//       model: 'gemini-2.5-flash-native-audio-preview-09-2025',
//       callbacks: {
//         onopen: async () => {
//           try {
//             micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
//             const session = await sessionPromise.current;
//             if (!session) return;
             
//             // Send initial context
//             session.sendRealtimeInput({
//                 media: { data: contextImageBase64, mimeType: 'image/jpeg' }
//             });
//             session.sendRealtimeInput({
//                 text: "The user has provided this image from their screen. Please analyze it and prepare to answer questions."
//             });

//             if (!inputAudioContext.current || inputAudioContext.current.state === 'closed') return;
//             mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(micStream.current);
//             scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            
//             scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
//               const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
//               const pcmBlob = audioUtils.createBlob(inputData);
//               sessionPromise.current?.then((sess) => {
//                   sess.sendRealtimeInput({ media: pcmBlob });
//               });
//             };
            
//             mediaStreamSource.current.connect(scriptProcessor.current);
//             scriptProcessor.current.connect(inputAudioContext.current.destination);

//             setIsConnecting(false);
//             setIsRecording(true);

//           } catch (err) {
//             setError(`Failed to get microphone access: ${err instanceof Error ? err.message : String(err)}`);
//             setIsConnecting(false);
//             cleanup();
//           }
//         },
//         onmessage: async (message: LiveServerMessage) => {
//           if (message.serverContent?.inputTranscription) {
//             const text = message.serverContent.inputTranscription.text;
//             // Fix: Cast to 'any' to access 'isFinal' property which is missing from the 'Transcription' type.
//             const isFinal = (message.serverContent.inputTranscription as any).isFinal ?? false;
//             currentInputTranscription.current += text;
            
//             setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'user' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentInputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'user', text: currentInputTranscription.current, isFinal }];
//             });
//           }
//           if (message.serverContent?.outputTranscription) {
//             const text = message.serverContent.outputTranscription.text;
//             // Fix: Cast to 'any' to access 'isFinal' property which is missing from the 'Transcription' type.
//             const isFinal = (message.serverContent.outputTranscription as any).isFinal ?? false;
//             currentOutputTranscription.current += text;

//              setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'ai' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentOutputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'ai', text: currentOutputTranscription.current, isFinal }];
//             });
//           }

//           if (message.serverContent?.turnComplete) {
//             currentInputTranscription.current = '';
//             currentOutputTranscription.current = '';
//           }

//           const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
//           if (base64Audio && outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//               nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              
//               const audioBuffer = await audioUtils.decodeAudioData(
//                   audioUtils.decode(base64Audio),
//                   outputAudioContext.current,
//                   24000,
//                   1
//               );
              
//               const source = outputAudioContext.current.createBufferSource();
//               source.buffer = audioBuffer;
//               source.connect(outputAudioContext.current.destination);
//               source.addEventListener('ended', () => {
//                   audioSources.current.delete(source);
//               });
//               source.start(nextStartTime.current);
//               nextStartTime.current += audioBuffer.duration;
//               audioSources.current.add(source);
//           }
          
//           if (message.serverContent?.interrupted) {
//             for (const source of audioSources.current.values()) {
//               source.stop();
//             }
//             audioSources.current.clear();
//             nextStartTime.current = 0;
//           }
//         },
//         onerror: (e: ErrorEvent) => {
//           setError(`Connection error: ${e.message}`);
//           cleanup();
//           stopScreenShare();
//         },
//         onclose: (e: CloseEvent) => {
//           cleanup();
//           // Don't stop screen share here, user might want to start another session
//         },
//       },
//       config: {
//         responseModalities: [Modality.AUDIO],
//         speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
//         inputAudioTranscription: {},
//         outputAudioTranscription: {},
//       },
//     });

//   }, [screenStream, cleanup, stopScreenShare]);

//   return {
//     screenStream,
//     isConnecting,
//     isRecording,
//     transcript,
//     error,
//     startScreenShare,
//     startSession,
//     stopSession,
//   };
// };











// import { useState, useRef, useCallback, useEffect } from 'react';
// import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
// import type { TranscriptMessage } from '../types.ts';
// import { audioUtils } from '../services/audioUtils.ts';

// const API_KEY = 'AIzaSyDeiFk7FPoMbDxvGD3cplDMUhd2Ae9HBck';

// export const useSightSpeak = () => {
//   const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const ai = useRef<GoogleGenAI | null>(null);
//   const sessionPromise = useRef<Promise<any> | null>(null);
//   const inputAudioContext = useRef<AudioContext | null>(null);
//   const outputAudioContext = useRef<AudioContext | null>(null);
//   const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
//   const micStream = useRef<MediaStream | null>(null);
//   const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);

//   const currentInputTranscription = useRef('');
//   const currentOutputTranscription = useRef('');
//   const nextStartTime = useRef(0);
//   const audioSources = useRef(new Set<AudioBufferSourceNode>());

//   useEffect(() => {
//     if (API_KEY) {
//       ai.current = new GoogleGenAI({ apiKey: API_KEY });
//     } else {
//       setError("API key is missing. Please provide a valid Google AI API key.");
//     }

//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible' && screenStream) {
//         console.log('Tab visible; resuming if paused.');
//       }
//     };
//     document.addEventListener('visibilitychange', handleVisibilityChange);
//     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
//   }, [screenStream]);

//   const stopScreenShare = useCallback(() => {
//     if (screenStream) {
//       screenStream.getTracks().forEach(track => track.stop());
//       setScreenStream(null);
//     }
//   }, [screenStream]);

//   const cleanup = useCallback(() => {
//     if (micStream.current) {
//       micStream.current.getTracks().forEach(track => track.stop());
//       micStream.current = null;
//     }
//     if (scriptProcessor.current) {
//       scriptProcessor.current.disconnect();
//       scriptProcessor.current = null;
//     }
//     if (mediaStreamSource.current) {
//       mediaStreamSource.current.disconnect();
//       mediaStreamSource.current = null;
//     }
//     if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
//       inputAudioContext.current.close();
//     }
//     if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//       outputAudioContext.current.close();
//     }
    
//     for (const source of audioSources.current.values()) {
//       source.stop();
//     }
//     audioSources.current.clear();
//     nextStartTime.current = 0;
    
//     setIsConnecting(false);
//     setIsRecording(false);
//   }, []);

//   const stopSession = useCallback(async () => {
//     if (sessionPromise.current) {
//       try {
//         const session = await sessionPromise.current;
//         session.close();
//       } catch (e) {
//         console.error("Error closing session:", e);
//       } finally {
//         sessionPromise.current = null;
//       }
//     }
//     cleanup();
//   }, [cleanup]);

//   const startScreenShare = useCallback(async () => {
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
//       setError("Screen sharing is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.");
//       return;
//     }
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: { cursor: "always" } as any,
//         audio: false,
//       });

//       const videoTracks = stream.getVideoTracks();
//       if (!videoTracks || videoTracks.length === 0) {
//         setError("Failed to get a video track from the screen share. The selected source might not have video.");
//         return;
//       }

//       // Detect potential self-capture
//       const settings = videoTracks[0].getSettings();
//       if (settings.displaySurface === 'browser') {
//         setError("Please share a different window or screen, not this tab, to avoid self-reference.");
//         stream.getTracks().forEach(track => track.stop());
//         return;
//       }

//       videoTracks[0].addEventListener('ended', () => {
//         setScreenStream(null);
//         if (isRecording) {
//           stopSession();
//         }
//       });
//       setScreenStream(stream);
//       setError(null);
//       console.log('Screen share started with stream settings:', settings);
//     } catch (err) {
//       let message = 'An unknown error occurred.';
//       if (err instanceof Error) {
//         if (err.name === 'NotAllowedError') {
//           message = 'Permission to share screen was denied. Please try again and grant permission.';
//         } else {
//           message = err.message;
//         }
//       }
//       setError(`Could not start screen share: ${message}`);
//     }
//   }, [isRecording, stopSession]);

//   const captureFrame = useCallback(async (): Promise<string> => {
//   if (!screenStream) throw new Error("No screen stream available.");
  
//   const videoTracks = screenStream.getVideoTracks();
//   if (!videoTracks || videoTracks.length === 0) {
//     throw new Error("No video track found in the shared screen stream.");
//   }
  
//   const track = videoTracks[0];
//   console.log('=== CAPTURE FRAME DEBUG ===');
//   console.log('Track state:', track.readyState);
//   console.log('Track enabled:', track.enabled);
  
//   const trackSettings = track.getSettings();
//   console.log('Track settings:', trackSettings);

//   // Create a fresh stream EVERY time
//   const updatedStream = new MediaStream([track.clone()]);
//   console.log('Created new MediaStream with cloned track');
  
//   const video = document.createElement('video');
//   video.style.position = 'fixed';
//   video.style.top = '-1000px';
//   video.style.visibility = 'hidden';
//   document.body.appendChild(video);

//   try {
//     video.srcObject = updatedStream;
//     video.muted = true;
//     console.log('Video element srcObject set');
    
//     return await new Promise<string>((resolve, reject) => {
//       const cleanupListeners = () => {
//         video.onplaying = null;
//         video.onerror = null;
//         clearTimeout(timeoutId);
//       };

//       const timeoutId = setTimeout(() => {
//         cleanupListeners();
//         console.error('TIMEOUT: Video did not start playing within 5 seconds');
//         reject(new Error("Timed out waiting for video to play."));
//       }, 5000);

//       video.onplaying = () => {
//         console.log('Video started playing');
//         console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
//         cleanupListeners();
        
//         requestAnimationFrame(() => {
//           try {
//             const canvas = document.createElement('canvas');
//             canvas.width = video.videoWidth;
//             canvas.height = video.videoHeight;
            
//             if (canvas.width === 0 || canvas.height === 0) {
//               console.error('Canvas has no dimensions');
//               return reject(new Error('Video has no dimensions. Is the shared window minimized?'));
//             }
            
//             const context = canvas.getContext('2d');
//             if (!context) {
//               console.error('Could not create canvas context');
//               return reject(new Error('Could not create 2D canvas context.'));
//             }
            
//             context.drawImage(video, 0, 0, canvas.width, canvas.height);
//             const frameData = canvas.toDataURL('image/jpeg').split(',')[1];
            
//             console.log('Frame captured successfully');
//             console.log('Frame data size:', frameData.length, 'bytes');
//             console.log('First 50 chars:', frameData.substring(0, 50));
//             console.log('=== END CAPTURE FRAME DEBUG ===');
            
//             resolve(frameData);
//           } catch (e) {
//             console.error('Error in requestAnimationFrame:', e);
//             reject(e);
//           }
//         });
//       };

//       video.onerror = () => {
//         cleanupListeners();
//         console.error('Video element error event');
//         reject(new Error("Video element encountered an error."));
//       };

//       video.play().catch(e => {
//         cleanupListeners();
//         console.error('Video play failed:', e);
//         reject(e);
//       });
//     });
//   } finally {
//     if (video.srcObject) {
//       const mediaStream = video.srcObject as MediaStream;
//       mediaStream.getTracks().forEach(t => {
//         console.log('Stopping track:', t.kind);
//         t.stop();
//       });
//     }
//     video.srcObject = null;
//     video.remove();
//   }
// }, [screenStream]);

//   const startSession = useCallback(async () => {
//     if (!screenStream) {
//       setError("Please share your screen first.");
//       return;
//     }
//     if (!ai.current) {
//       setError("AI client not initialized.");
//       return;
//     }

//     setError(null);
//     setIsConnecting(true);
//     setTranscript([]);

//     let contextImageBase64: string;
//     try {
//       contextImageBase64 = await captureFrame();
//     } catch (err) {
//       setError(`Failed to capture screen frame: ${err instanceof Error ? err.message : String(err)}`);
//       setIsConnecting(false);
//       return;
//     }
    
//     inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
//     outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

//     sessionPromise.current = ai.current.live.connect({
//       model: 'gemini-2.5-flash-native-audio-preview-09-2025',
//       callbacks: {
//         onopen: async () => {
//           try {
//             micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
//             const session = await sessionPromise.current;
//             if (!session) return;
             
//             session.sendRealtimeInput({
//                 media: { data: contextImageBase64, mimeType: 'image/jpeg' }
//             });
//             session.sendRealtimeInput({
//                 text: "The user has provided this image from their screen. Please analyze it and prepare to answer questions."
//             });

//             if (!inputAudioContext.current || inputAudioContext.current.state === 'closed') return;
//             mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(micStream.current);
//             scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            
//             scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
//               const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
//               const pcmBlob = audioUtils.createBlob(inputData);
//               sessionPromise.current?.then((sess) => {
//                   sess.sendRealtimeInput({ media: pcmBlob });
//               });
//             };
            
//             mediaStreamSource.current.connect(scriptProcessor.current);
//             scriptProcessor.current.connect(inputAudioContext.current.destination);

//             setIsConnecting(false);
//             setIsRecording(true);

//           } catch (err) {
//             setError(`Failed to get microphone access: ${err instanceof Error ? err.message : String(err)}`);
//             setIsConnecting(false);
//             cleanup();
//           }
//         },
//         onmessage: async (message: LiveServerMessage) => {
//           if (message.serverContent?.inputTranscription) {
//             const text = message.serverContent.inputTranscription.text;
//             const isFinal = (message.serverContent.inputTranscription as any).isFinal ?? false;
//             currentInputTranscription.current += text;
            
//             setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'user' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentInputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'user', text: currentInputTranscription.current, isFinal }];
//             });
//           }
//           if (message.serverContent?.outputTranscription) {
//             const text = message.serverContent.outputTranscription.text;
//             const isFinal = (message.serverContent.outputTranscription as any).isFinal ?? false;
//             currentOutputTranscription.current += text;

//              setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'ai' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentOutputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'ai', text: currentOutputTranscription.current, isFinal }];
//             });
//           }

//           if (message.serverContent?.turnComplete) {
//             currentInputTranscription.current = '';
//             currentOutputTranscription.current = '';
//           }

//           const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
//           if (base64Audio && outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//               nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              
//               const audioBuffer = await audioUtils.decodeAudioData(
//                   audioUtils.decode(base64Audio),
//                   outputAudioContext.current,
//                   24000,
//                   1
//               );
              
//               const source = outputAudioContext.current.createBufferSource();
//               source.buffer = audioBuffer;
//               source.connect(outputAudioContext.current.destination);
//               source.addEventListener('ended', () => {
//                   audioSources.current.delete(source);
//               });
//               source.start(nextStartTime.current);
//               nextStartTime.current += audioBuffer.duration;
//               audioSources.current.add(source);
//           }
          
//           if (message.serverContent?.interrupted) {
//             for (const source of audioSources.current.values()) {
//               source.stop();
//             }
//             audioSources.current.clear();
//             nextStartTime.current = 0;
//           }
//         },
//         onerror: (e: ErrorEvent) => {
//           setError(`Connection error: ${e.message}`);
//           cleanup();
//           stopScreenShare();
//         },
//         onclose: (e: CloseEvent) => {
//           cleanup();
//         },
//       },
//       config: {
//         responseModalities: [Modality.AUDIO],
//         speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
//         inputAudioTranscription: {},
//         outputAudioTranscription: {},
//       },
//     });

//   }, [screenStream, cleanup, stopScreenShare, captureFrame]);

//   const askQuestion = useCallback(async (question: string) => {
//   console.log('=== ASK QUESTION START ===');
//   console.log('Question:', question);
//   console.log('Current screenStream:', screenStream);
//   console.log('screenStream tracks:', screenStream?.getVideoTracks().length);

//   if (!screenStream || !ai.current) {
//     console.error('Missing screenStream or ai.current');
//     setError("Screen not shared or AI not initialized.");
//     return;
//   }

//   try {
//     // Step 1: Capture FRESH frame for the current question
//     console.log('Starting frame capture...');
//     const frameData = await captureFrame();
    
//     console.log('Frame captured');
//     console.log('Question frame size:', frameData?.length, 'bytes');
//     console.log('Question frame first 50 chars:', frameData?.substring(0, 50));

//     if (!frameData) {
//       console.error('frameData is null or empty');
//       throw new Error('Failed to capture current screen frame');
//     }

//     // Step 2: Build the prompt with transcript context
//     const transcriptContext = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
//     const fullPrompt = `User screen context has changed. Previous conversation:\n${transcriptContext}\n\nCurrent question: ${question}`;
    
//     console.log('Prompt built, length:', fullPrompt.length);
//     console.log('Sending to Gemini with fresh screenshot...');

//     // Step 3: Send to Gemini REST API with fresh screenshot
//     const result = await ai.current.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: [{
//         role: 'user',
//         parts: [
//           { text: fullPrompt },
//           { inlineData: { data: frameData, mimeType: 'image/jpeg' } }
//         ]
//       }]
//     });

//     const answer = result.response.text();
//     console.log('AI Answer received, length:', answer.length);
//     console.log('Answer preview:', answer.substring(0, 100) + '...');

//     // Step 4: Update transcript with AI response
//     setTranscript(prev => {
//       const updated = [
//         ...prev,
//         { speaker: 'user', text: question, isFinal: true },
//         { speaker: 'ai', text: answer, isFinal: true }
//       ];
//       console.log('Transcript updated, new length:', updated.length);
//       return updated;
//     });

//     console.log('=== ASK QUESTION END (SUCCESS) ===');
//   } catch (err) {
//     console.error('=== ASK QUESTION ERROR ===');
//     console.error('Error details:', err);
//     console.error('Error message:', err instanceof Error ? err.message : String(err));
//     setError(`Failed to ask question: ${err instanceof Error ? err.message : String(err)}`);
//   }
// }, [screenStream, transcript, captureFrame, ai]);
//   return {
//     screenStream,
//     isConnecting,
//     isRecording,
//     transcript,
//     error,
//     startScreenShare,
//     startSession,
//     stopSession,
//     askQuestion,
//   };
// };











// import { useState, useRef, useCallback, useEffect } from 'react';
// import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
// import type { TranscriptMessage } from '../types.ts';
// import { audioUtils } from '../services/audioUtils.ts';

// const API_KEY = 'AIzaSyDeiFk7FPoMbDxvGD3cplDMUhd2Ae9HBck';

// export const useSightSpeak = () => {
//   const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const ai = useRef<GoogleGenAI | null>(null);
//   const sessionPromise = useRef<Promise<any> | null>(null);
//   const inputAudioContext = useRef<AudioContext | null>(null);
//   const outputAudioContext = useRef<AudioContext | null>(null);
//   const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
//   const micStream = useRef<MediaStream | null>(null);
//   const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  
//   // NEW: For continuous context updates
//   const contextUpdateInterval = useRef<NodeJS.Timeout | null>(null);
//   const lastContextHash = useRef<string>('');

//   const currentInputTranscription = useRef('');
//   const currentOutputTranscription = useRef('');
//   const nextStartTime = useRef(0);
//   const audioSources = useRef(new Set<AudioBufferSourceNode>());

//   useEffect(() => {
//     if (API_KEY) {
//       ai.current = new GoogleGenAI({ apiKey: API_KEY });
//     } else {
//       setError("API key is missing. Please provide a valid Google AI API key.");
//     }

//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible' && screenStream) {
//         console.log('Tab visible; resuming if paused.');
//       }
//     };
//     document.addEventListener('visibilitychange', handleVisibilityChange);
//     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
//   }, [screenStream]);

//   const stopScreenShare = useCallback(() => {
//     if (screenStream) {
//       screenStream.getTracks().forEach(track => track.stop());
//       setScreenStream(null);
//     }
//   }, [screenStream]);

//   const cleanup = useCallback(() => {
//     // Stop context update interval
//     if (contextUpdateInterval.current) {
//       clearInterval(contextUpdateInterval.current);
//       contextUpdateInterval.current = null;
//     }

//     if (micStream.current) {
//       micStream.current.getTracks().forEach(track => track.stop());
//       micStream.current = null;
//     }
//     if (scriptProcessor.current) {
//       scriptProcessor.current.disconnect();
//       scriptProcessor.current = null;
//     }
//     if (mediaStreamSource.current) {
//       mediaStreamSource.current.disconnect();
//       mediaStreamSource.current = null;
//     }
//     if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
//       inputAudioContext.current.close();
//     }
//     if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//       outputAudioContext.current.close();
//     }
    
//     for (const source of audioSources.current.values()) {
//       source.stop();
//     }
//     audioSources.current.clear();
//     nextStartTime.current = 0;
    
//     setIsConnecting(false);
//     setIsRecording(false);
//   }, []);

//   const stopSession = useCallback(async () => {
//     if (sessionPromise.current) {
//       try {
//         const session = await sessionPromise.current;
//         session.close();
//       } catch (e) {
//         console.error("Error closing session:", e);
//       } finally {
//         sessionPromise.current = null;
//       }
//     }
//     cleanup();
//   }, [cleanup]);

//   const startScreenShare = useCallback(async () => {
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
//       setError("Screen sharing is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.");
//       return;
//     }
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: { cursor: "always" } as any,
//         audio: false,
//       });

//       const videoTracks = stream.getVideoTracks();
//       if (!videoTracks || videoTracks.length === 0) {
//         setError("Failed to get a video track from the screen share. The selected source might not have video.");
//         return;
//       }

//       videoTracks[0].addEventListener('ended', () => {
//         setScreenStream(null);
//         if (isRecording) {
//           stopSession();
//         }
//       });
//       setScreenStream(stream);
//       setError(null);
//       console.log('Screen share started');
//     } catch (err) {
//       let message = 'An unknown error occurred.';
//       if (err instanceof Error) {
//         if (err.name === 'NotAllowedError') {
//           message = 'Permission to share screen was denied. Please try again and grant permission.';
//         } else {
//           message = err.message;
//         }
//       }
//       setError(`Could not start screen share: ${message}`);
//     }
//   }, [isRecording, stopSession]);

//   const captureFrame = useCallback(async (): Promise<string> => {
//     if (!screenStream) throw new Error("No screen stream available.");
//     const videoTracks = screenStream.getVideoTracks();
//     if (!videoTracks || videoTracks.length === 0) {
//       throw new Error("No video track found in the shared screen stream.");
//     }
//     const track = videoTracks[0];

//     const updatedStream = new MediaStream([track.clone()]);
//     const video = document.createElement('video');
//     video.style.position = 'fixed';
//     video.style.top = '-1000px';
//     video.style.visibility = 'hidden';
//     document.body.appendChild(video);

//     try {
//       video.srcObject = updatedStream;
//       video.muted = true;
//       return await new Promise<string>((resolve, reject) => {
//         const cleanupListeners = () => {
//           video.onplaying = null;
//           video.onerror = null;
//           clearTimeout(timeoutId);
//         };

//         const timeoutId = setTimeout(() => {
//           cleanupListeners();
//           reject(new Error("Timed out waiting for video to play."));
//         }, 5000);

//         video.onplaying = () => {
//           cleanupListeners();
//           requestAnimationFrame(() => {
//             try {
//               const canvas = document.createElement('canvas');
//               canvas.width = video.videoWidth;
//               canvas.height = video.videoHeight;
//               if (canvas.width === 0 || canvas.height === 0) {
//                 return reject(new Error('Video has no dimensions. Is the shared window minimized?'));
//               }
//               const context = canvas.getContext('2d');
//               if (!context) {
//                 return reject(new Error('Could not create 2D canvas context.'));
//               }
//               context.drawImage(video, 0, 0, canvas.width, canvas.height);
//               const frameData = canvas.toDataURL('image/jpeg').split(',')[1];
//               resolve(frameData);
//             } catch (e) {
//               reject(e);
//             }
//           });
//         };

//         video.onerror = () => {
//           cleanupListeners();
//           reject(new Error("Video element encountered an error."));
//         };

//         video.play().catch(e => {
//           cleanupListeners();
//           reject(e);
//         });
//       });
//     } finally {
//       if (video.srcObject) {
//         const mediaStream = video.srcObject as MediaStream;
//         mediaStream.getTracks().forEach(t => t.stop());
//       }
//       video.srcObject = null;
//       video.remove();
//     }
//   }, [screenStream]);

//   // NEW: Function to continuously update context
//   const startContextUpdates = useCallback(() => {
//     if (contextUpdateInterval.current) {
//       clearInterval(contextUpdateInterval.current);
//     }

//     contextUpdateInterval.current = setInterval(async () => {
//       try {
//         const frameData = await captureFrame();
//         const session = await sessionPromise.current;
        
//         if (session && frameData && frameData !== lastContextHash.current) {
//           lastContextHash.current = frameData;
          
//           session.sendRealtimeInput({
//             media: { data: frameData, mimeType: 'image/jpeg' }
//           });
          
//           console.log('📸 Context updated with fresh screenshot');
//         }
//       } catch (err) {
//         console.error('Error updating context:', err);
//       }
//     }, 2000); // Update every 2 seconds
//   }, [captureFrame]);

//   const startSession = useCallback(async () => {
//     if (!screenStream) {
//       setError("Please share your screen first.");
//       return;
//     }
//     if (!ai.current) {
//       setError("AI client not initialized.");
//       return;
//     }

//     setError(null);
//     setIsConnecting(true);
//     setTranscript([]);

//     let contextImageBase64: string;
//     try {
//       contextImageBase64 = await captureFrame();
//     } catch (err) {
//       setError(`Failed to capture screen frame: ${err instanceof Error ? err.message : String(err)}`);
//       setIsConnecting(false);
//       return;
//     }
    
//     inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
//     outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

//     sessionPromise.current = ai.current.live.connect({
//       model: 'gemini-2.5-flash-native-audio-preview-09-2025',
//       callbacks: {
//         onopen: async () => {
//           try {
//             micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
//             const session = await sessionPromise.current;
//             if (!session) return;
             
//             session.sendRealtimeInput({
//                 media: { data: contextImageBase64, mimeType: 'image/jpeg' }
//             });
//             session.sendRealtimeInput({
//                 text: "Analyze this screen and provide real-time feedback as it changes. Watch for updates and comment on any changes you see."
//             });

//             if (!inputAudioContext.current || inputAudioContext.current.state === 'closed') return;
//             mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(micStream.current);
//             scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            
//             scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
//               const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
//               const pcmBlob = audioUtils.createBlob(inputData);
//               sessionPromise.current?.then((sess) => {
//                   sess.sendRealtimeInput({ media: pcmBlob });
//               });
//             };
            
//             mediaStreamSource.current.connect(scriptProcessor.current);
//             scriptProcessor.current.connect(inputAudioContext.current.destination);

//             // START CONTINUOUS CONTEXT UPDATES
//             startContextUpdates();

//             setIsConnecting(false);
//             setIsRecording(true);

//           } catch (err) {
//             setError(`Failed to get microphone access: ${err instanceof Error ? err.message : String(err)}`);
//             setIsConnecting(false);
//             cleanup();
//           }
//         },
//         onmessage: async (message: LiveServerMessage) => {
//           if (message.serverContent?.inputTranscription) {
//             const text = message.serverContent.inputTranscription.text;
//             const isFinal = (message.serverContent.inputTranscription as any).isFinal ?? false;
//             currentInputTranscription.current += text;
            
//             setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'user' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentInputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'user', text: currentInputTranscription.current, isFinal }];
//             });
//           }
//           if (message.serverContent?.outputTranscription) {
//             const text = message.serverContent.outputTranscription.text;
//             const isFinal = (message.serverContent.outputTranscription as any).isFinal ?? false;
//             currentOutputTranscription.current += text;

//              setTranscript(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.speaker === 'ai' && !last.isFinal) {
//                     const newTranscript = [...prev];
//                     newTranscript[newTranscript.length - 1] = { ...last, text: currentOutputTranscription.current, isFinal };
//                     return newTranscript;
//                 }
//                 return [...prev, { speaker: 'ai', text: currentOutputTranscription.current, isFinal }];
//             });
//           }

//           if (message.serverContent?.turnComplete) {
//             currentInputTranscription.current = '';
//             currentOutputTranscription.current = '';
//           }

//           const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
//           if (base64Audio && outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
//               nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              
//               const audioBuffer = await audioUtils.decodeAudioData(
//                   audioUtils.decode(base64Audio),
//                   outputAudioContext.current,
//                   24000,
//                   1
//               );
              
//               const source = outputAudioContext.current.createBufferSource();
//               source.buffer = audioBuffer;
//               source.connect(outputAudioContext.current.destination);
//               source.addEventListener('ended', () => {
//                   audioSources.current.delete(source);
//               });
//               source.start(nextStartTime.current);
//               nextStartTime.current += audioBuffer.duration;
//               audioSources.current.add(source);
//           }
          
//           if (message.serverContent?.interrupted) {
//             for (const source of audioSources.current.values()) {
//               source.stop();
//             }
//             audioSources.current.clear();
//             nextStartTime.current = 0;
//           }
//         },
//         onerror: (e: ErrorEvent) => {
//           setError(`Connection error: ${e.message}`);
//           cleanup();
//           stopScreenShare();
//         },
//         onclose: (e: CloseEvent) => {
//           cleanup();
//         },
//       },
//       config: {
//         responseModalities: [Modality.AUDIO],
//         speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
//         inputAudioTranscription: {},
//         outputAudioTranscription: {},
//       },
//     });

//   }, [screenStream, cleanup, stopScreenShare, captureFrame, startContextUpdates]);

//   const askQuestion = useCallback(async (question: string) => {
//     if (!sessionPromise.current) {
//       setError("No active session. Start conversation first.");
//       return;
//     }

//     try {
//       const session = await sessionPromise.current;
//       session.sendRealtimeInput({
//         text: question
//       });
//       console.log('Question sent to live session:', question);
//     } catch (err) {
//       console.error('askQuestion error:', err);
//       setError(`Failed to ask question: ${err instanceof Error ? err.message : String(err)}`);
//     }
//   }, []);

//   return {
//     screenStream,
//     isConnecting,
//     isRecording,
//     transcript,
//     error,
//     startScreenShare,
//     startSession,
//     stopSession,
//     askQuestion,
//   };
// };

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import type { TranscriptMessage } from '../types.ts';
import { audioUtils } from '../services/audioUtils.ts';

const API_KEY = 'AIzaSyDeiFk7FPoMbDxvGD3cplDMUhd2Ae9HBck';

export const useSightSpeak = () => {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ai = useRef<GoogleGenAI | null>(null);
  const sessionPromise = useRef<Promise<any> | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // NEW: For continuous context updates
  const contextUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const lastContextHash = useRef<string>('');

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const nextStartTime = useRef(0);
  const audioSources = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    if (API_KEY) {
      ai.current = new GoogleGenAI({ apiKey: API_KEY });
    } else {
      setError("API key is missing. Please provide a valid Google AI API key.");
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && screenStream) {
        console.log('Tab visible; resuming if paused.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [screenStream]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [screenStream]);

  const cleanup = useCallback(() => {
    // Stop context update interval
    if (contextUpdateInterval.current) {
      clearInterval(contextUpdateInterval.current);
      contextUpdateInterval.current = null;
    }

    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current = null;
    }
    if (mediaStreamSource.current) {
      mediaStreamSource.current.disconnect();
      mediaStreamSource.current = null;
    }
    if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
      inputAudioContext.current.close();
    }
    if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
      outputAudioContext.current.close();
    }
    
    for (const source of audioSources.current.values()) {
      source.stop();
    }
    audioSources.current.clear();
    nextStartTime.current = 0;
    
    setIsConnecting(false);
    setIsRecording(false);
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionPromise.current) {
      try {
        const session = await sessionPromise.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      } finally {
        sessionPromise.current = null;
      }
    }
    cleanup();
  }, [cleanup]);

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setError("Screen sharing is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false,
      });

      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        setError("Failed to get a video track from the screen share. The selected source might not have video.");
        return;
      }

      videoTracks[0].addEventListener('ended', () => {
        setScreenStream(null);
        if (isRecording) {
          stopSession();
        }
      });
      setScreenStream(stream);
      setError(null);
      console.log('Screen share started');
    } catch (err) {
      let message = 'An unknown error occurred.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Permission to share screen was denied. Please try again and grant permission.';
        } else {
          message = err.message;
        }
      }
      setError(`Could not start screen share: ${message}`);
    }
  }, [isRecording, stopSession]);

  const captureFrame = useCallback(async (): Promise<string> => {
    if (!screenStream) throw new Error("No screen stream available.");
    const videoTracks = screenStream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) {
      throw new Error("No video track found in the shared screen stream.");
    }
    const track = videoTracks[0];

    const updatedStream = new MediaStream([track.clone()]);
    const video = document.createElement('video');
    video.style.position = 'fixed';
    video.style.top = '-1000px';
    video.style.visibility = 'hidden';
    document.body.appendChild(video);

    try {
      video.srcObject = updatedStream;
      video.muted = true;
      return await new Promise<string>((resolve, reject) => {
        const cleanupListeners = () => {
          video.onplaying = null;
          video.onerror = null;
          clearTimeout(timeoutId);
        };

        const timeoutId = setTimeout(() => {
          cleanupListeners();
          reject(new Error("Timed out waiting for video to play."));
        }, 5000);

        video.onplaying = () => {
          cleanupListeners();
          requestAnimationFrame(() => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              if (canvas.width === 0 || canvas.height === 0) {
                return reject(new Error('Video has no dimensions. Is the shared window minimized?'));
              }
              const context = canvas.getContext('2d');
              if (!context) {
                return reject(new Error('Could not create 2D canvas context.'));
              }
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL('image/jpeg').split(',')[1];
              resolve(frameData);
            } catch (e) {
              reject(e);
            }
          });
        };

        video.onerror = () => {
          cleanupListeners();
          reject(new Error("Video element encountered an error."));
        };

        video.play().catch(e => {
          cleanupListeners();
          reject(e);
        });
      });
    } finally {
      if (video.srcObject) {
        const mediaStream = video.srcObject as MediaStream;
        mediaStream.getTracks().forEach(t => t.stop());
      }
      video.srcObject = null;
      video.remove();
    }
  }, [screenStream]);

  // NEW: Function to continuously update context
  const startContextUpdates = useCallback(() => {
    if (contextUpdateInterval.current) {
      clearInterval(contextUpdateInterval.current);
    }

    contextUpdateInterval.current = setInterval(async () => {
      try {
        const frameData = await captureFrame();
        const session = await sessionPromise.current;
        
        if (session && frameData && frameData !== lastContextHash.current) {
          lastContextHash.current = frameData;
          
          session.sendRealtimeInput({
            media: { data: frameData, mimeType: 'image/jpeg' }
          });
          
          console.log('📸 Context updated with fresh screenshot');
        }
      } catch (err) {
        console.error('Error updating context:', err);
      }
    }, 500); // Update every 500ms (faster updates)
  }, [captureFrame]);

  const startSession = useCallback(async () => {
    if (!screenStream) {
      setError("Please share your screen first.");
      return;
    }
    if (!ai.current) {
      setError("AI client not initialized.");
      return;
    }

    setError(null);
    setIsConnecting(true);
    setTranscript([]);

    let contextImageBase64: string;
    try {
      contextImageBase64 = await captureFrame();
    } catch (err) {
      setError(`Failed to capture screen frame: ${err instanceof Error ? err.message : String(err)}`);
      setIsConnecting(false);
      return;
    }
    
    inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    sessionPromise.current = ai.current.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: async () => {
          try {
            micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const session = await sessionPromise.current;
            if (!session) return;
             
            session.sendRealtimeInput({
                media: { data: contextImageBase64, mimeType: 'image/jpeg' }
            });
            session.sendRealtimeInput({
                text: "Analyze this screen and provide real-time feedback as it changes. Watch for updates and comment on any changes you see."
            });

            if (!inputAudioContext.current || inputAudioContext.current.state === 'closed') return;
            mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(micStream.current);
            scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = audioUtils.createBlob(inputData);
              sessionPromise.current?.then((sess) => {
                  sess.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            mediaStreamSource.current.connect(scriptProcessor.current);
            scriptProcessor.current.connect(inputAudioContext.current.destination);

            // START CONTINUOUS CONTEXT UPDATES
            startContextUpdates();

            setIsConnecting(false);
            setIsRecording(true);

          } catch (err) {
            setError(`Failed to get microphone access: ${err instanceof Error ? err.message : String(err)}`);
            setIsConnecting(false);
            cleanup();
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            const isFinal = (message.serverContent.inputTranscription as any).isFinal ?? false;
            currentInputTranscription.current += text;
            
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'user' && !last.isFinal) {
                    const newTranscript = [...prev];
                    newTranscript[newTranscript.length - 1] = { ...last, text: currentInputTranscription.current, isFinal };
                    return newTranscript;
                }
                return [...prev, { speaker: 'user', text: currentInputTranscription.current, isFinal }];
            });
          }
          if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            const isFinal = (message.serverContent.outputTranscription as any).isFinal ?? false;
            currentOutputTranscription.current += text;

             setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'ai' && !last.isFinal) {
                    const newTranscript = [...prev];
                    newTranscript[newTranscript.length - 1] = { ...last, text: currentOutputTranscription.current, isFinal };
                    return newTranscript;
                }
                return [...prev, { speaker: 'ai', text: currentOutputTranscription.current, isFinal }];
            });
          }

          if (message.serverContent?.turnComplete) {
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
              nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              
              const audioBuffer = await audioUtils.decodeAudioData(
                  audioUtils.decode(base64Audio),
                  outputAudioContext.current,
                  24000,
                  1
              );
              
              const source = outputAudioContext.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.current.destination);
              source.addEventListener('ended', () => {
                  audioSources.current.delete(source);
              });
              source.start(nextStartTime.current);
              nextStartTime.current += audioBuffer.duration;
              audioSources.current.add(source);
          }
          
          if (message.serverContent?.interrupted) {
            for (const source of audioSources.current.values()) {
              source.stop();
            }
            audioSources.current.clear();
            nextStartTime.current = 0;
          }
        },
        onerror: (e: ErrorEvent) => {
          setError(`Connection error: ${e.message}`);
          cleanup();
          stopScreenShare();
        },
        onclose: (e: CloseEvent) => {
          cleanup();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

  }, [screenStream, cleanup, stopScreenShare, captureFrame, startContextUpdates]);

  const askQuestion = useCallback(async (question: string) => {
    if (!sessionPromise.current) {
      setError("No active session. Start conversation first.");
      return;
    }

    try {
      const session = await sessionPromise.current;
      session.sendRealtimeInput({
        text: question
      });
      console.log('Question sent to live session:', question);
    } catch (err) {
      console.error('askQuestion error:', err);
      setError(`Failed to ask question: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return {
    screenStream,
    isConnecting,
    isRecording,
    transcript,
    error,
    startScreenShare,
    startSession,
    stopSession,
    askQuestion,
  };
};