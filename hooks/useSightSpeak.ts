
import { useState, useRef, useCallback, useEffect } from 'react';
// Fix: Removed non-exported 'LiveSession' type from @google/genai import.
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
  // Fix: Used 'any' for the session promise type as 'LiveSession' is not exported from the library.
  const sessionPromise = useRef<Promise<any> | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  
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
  }, []);
  
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [screenStream]);


  const cleanup = useCallback(() => {
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
      if(inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
        inputAudioContext.current.close();
      }
      if(outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
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

      // When the user stops sharing via the browser UI
      videoTracks[0].addEventListener('ended', () => {
        setScreenStream(null);
        if (isRecording) {
            stopSession();
        }
      });
      setScreenStream(stream);
      setError(null); // Clear previous errors
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

    // Capture a frame from the screen stream for context
    let contextImageBase64: string;
    try {
        const videoTracks = screenStream.getVideoTracks();
        if (!videoTracks || videoTracks.length === 0) {
            throw new Error("No video track found in the shared screen stream.");
        }
        const track = videoTracks[0];

        // Use a video element to capture a frame for better browser compatibility
        const video = document.createElement('video');
        // Make it invisible but part of the DOM to help with playback policies
        video.style.position = 'fixed';
        video.style.top = '-1000px';
        video.style.visibility = 'hidden';
        document.body.appendChild(video);

        try {
            video.srcObject = new MediaStream([track.clone()]);
            video.muted = true;
            
            contextImageBase64 = await new Promise<string>((resolve, reject) => {
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
                    // Use requestAnimationFrame to ensure the frame is painted before capture
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
                            resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
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
            // Cleanup video element and stream
            if (video.srcObject) {
                const mediaStream = video.srcObject as MediaStream;
                mediaStream.getTracks().forEach(t => t.stop());
            }
            video.srcObject = null;
            video.remove();
        }
    } catch (err) {
        setError(`Failed to capture screen frame: ${err instanceof Error ? err.message : String(err)}`);
        setIsConnecting(false);
        return;
    }
    
    // Fix: Cast window to `any` to allow `webkitAudioContext` for older browser compatibility, resolving TypeScript errors.
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
             
            // Send initial context
            session.sendRealtimeInput({
                media: { data: contextImageBase64, mimeType: 'image/jpeg' }
            });
            session.sendRealtimeInput({
                text: "The user has provided this image from their screen. Please analyze it and prepare to answer questions."
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
            // Fix: Cast to 'any' to access 'isFinal' property which is missing from the 'Transcription' type.
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
            // Fix: Cast to 'any' to access 'isFinal' property which is missing from the 'Transcription' type.
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
          // Don't stop screen share here, user might want to start another session
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

  }, [screenStream, cleanup, stopScreenShare]);

  return {
    screenStream,
    isConnecting,
    isRecording,
    transcript,
    error,
    startScreenShare,
    startSession,
    stopSession,
  };
};







// // useSightSpeak.ts
// import { useEffect, useRef, useState, useCallback } from 'react';

// type TranscriptMessage = {
//   speaker: 'user' | 'assistant' | 'system';
//   text: string;
//   isFinal?: boolean;
//   timestamp?: number;
// };

// type UseSightSpeakReturn = {
//   screenStream: MediaStream | null;
//   isConnecting: boolean;
//   isRecording: boolean;
//   transcript: TranscriptMessage[];
//   error: string | null;
//   startScreenShare: () => Promise<void>;
//   startSession: () => Promise<void>;
//   stopSession: () => Promise<void>;
// };

// // ✅ Use env var if available; else fallback to null (mock mode)
// const WS_URL =
//   import.meta.env.VITE_REALTIME_WS_URL ||
//   (process.env.VITE_REALTIME_WS_URL as string | undefined) ||
//   null;

// export function useSightSpeak(): UseSightSpeakReturn {
//   const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   // Refs
//   const wsRef = useRef<WebSocket | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const captureVideoRef = useRef<HTMLVideoElement | null>(null);
//   const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

//   const partialBufferRef = useRef<string>('');

//   // Utility: push transcript items
//   const pushTranscript = useCallback((msg: TranscriptMessage) => {
//     setTranscript((prev) => [...prev, msg]);
//   }, []);

//   // 🧠 Start screen sharing
//   const startScreenShare = useCallback(async () => {
//     try {
//       setError(null);
//       const stream = await (navigator.mediaDevices as any).getDisplayMedia({
//         video: { frameRate: 15 },
//         audio: false,
//       });
//       setScreenStream(stream);

//       let vid = captureVideoRef.current;
//       if (!vid) {
//         vid = document.createElement('video');
//         vid.style.position = 'fixed';
//         vid.style.left = '-10000px';
//         vid.style.top = '-10000px';
//         vid.muted = true;
//         vid.playsInline = true;
//         vid.autoplay = true;
//         captureVideoRef.current = vid;
//         document.body.appendChild(vid);
//       }
//       vid.srcObject = stream;
//       await vid.play();

//       if (!hiddenCanvasRef.current) {
//         const canvas = document.createElement('canvas');
//         canvas.style.position = 'fixed';
//         canvas.style.left = '-10001px';
//         canvas.style.top = '-10001px';
//         hiddenCanvasRef.current = canvas;
//         document.body.appendChild(canvas);
//       }
//     } catch (err: any) {
//       console.error('Screen share failed', err);
//       setError('Screen share failed: ' + String(err?.message || err));
//     }
//   }, []);

//   // 📸 Capture screenshot
//   const captureScreenshot = useCallback((maxWidth = 1200, quality = 0.5) => {
//     const vid = captureVideoRef.current;
//     const canvas = hiddenCanvasRef.current;
//     if (!vid || !canvas) return null;

//     const videoWidth = vid.videoWidth || 800;
//     const videoHeight = vid.videoHeight || 600;
//     const scale = Math.min(1, maxWidth / videoWidth);
//     canvas.width = Math.floor(videoWidth * scale);
//     canvas.height = Math.floor(videoHeight * scale);
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return null;
//     ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
//     try {
//       return canvas.toDataURL('image/jpeg', quality);
//     } catch (err) {
//       console.warn('Failed to toDataURL', err);
//       return null;
//     }
//   }, []);

//   // 🧩 Mock AI response (when WS unavailable)
//   const mockResponse = useCallback((msg: string) => {
//     pushTranscript({ speaker: 'assistant', text: '🤖 Thinking...', timestamp: Date.now() });
//     setTimeout(() => {
//       if (msg.toLowerCase().includes('screen')) {
//         pushTranscript({
//           speaker: 'assistant',
//           text: 'Analyzing your screen... please wait...',
//           timestamp: Date.now(),
//         });
//         setTimeout(() => {
//           pushTranscript({
//             speaker: 'assistant',
//             text: '✅ Screen analysis complete (mock mode).',
//             isFinal: true,
//             timestamp: Date.now(),
//           });
//         }, 1500);
//       } else {
//         pushTranscript({
//           speaker: 'assistant',
//           text: `I received "${msg}". (mock mode active)`,
//           isFinal: true,
//           timestamp: Date.now(),
//         });
//       }
//     }, 1000);
//   }, [pushTranscript]);

//   // 🧠 Connect WebSocket (with mock fallback)
//   const connectWS = useCallback(() => {
//     if (!WS_URL) {
//       console.warn('⚠️ No WebSocket URL configured — using mock mode.');
//       // Create a mock WebSocket-like object
//       wsRef.current = {
//         readyState: 1,
//         send: (msg: string) => {
//           console.log('🧩 Mock send:', msg);
//           try {
//             const parsed = JSON.parse(msg);
//             if (parsed.type === 'screenshot') {
//               mockResponse('screen');
//             }
//           } catch {
//             mockResponse(msg);
//           }
//         },
//         close: () => console.log('Mock WS closed'),
//       } as unknown as WebSocket;
//       return wsRef.current;
//     }

//     // ✅ Real WebSocket path
//     setIsConnecting(true);
//     const ws = new WebSocket(WS_URL);
//     ws.binaryType = 'arraybuffer';

//     ws.onopen = () => {
//       console.log('✅ Realtime WS connected');
//       setIsConnecting(false);
//       ws.send(JSON.stringify({ type: 'session.start', sessionId: Date.now().toString() }));
//       pushTranscript({
//         speaker: 'system',
//         text: '[Realtime connection established]',
//         timestamp: Date.now(),
//       });
//     };

//     ws.onmessage = (evt) => {
//       try {
//         const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
//         if (data?.type === 'partial_response') {
//           const text = data.text || '';
//           partialBufferRef.current = text;
//           setTranscript((prev) => {
//             const last = prev[prev.length - 1];
//             if (last && last.speaker === 'assistant' && !last.isFinal) {
//               const copy = prev.slice(0, -1);
//               copy.push({ speaker: 'assistant', text, isFinal: false, timestamp: Date.now() });
//               return copy;
//             } else {
//               return [...prev, { speaker: 'assistant', text, isFinal: false, timestamp: Date.now() }];
//             }
//           });
//         } else if (data?.type === 'final_response') {
//           const text = data.text || '';
//           setTranscript((prev) => [
//             ...prev,
//             { speaker: 'assistant', text, isFinal: true, timestamp: Date.now() },
//           ]);
//           partialBufferRef.current = '';
//         } else if (data?.type === 'info') {
//           console.info('relay:', data.message);
//         } else if (data?.type === 'error') {
//           const msg = data.message || 'Unknown error';
//           setError(msg);
//         }
//       } catch (err) {
//         console.error('WS parse error', err);
//       }
//     };

//     ws.onerror = (ev) => {
//       console.error('❌ WebSocket error', ev);
//       setError('WebSocket connection failed — switching to mock mode.');
//       mockResponse('websocket error');
//       ws.close();
//     };

//     ws.onclose = () => {
//       console.warn('⚠️ WebSocket closed');
//       setIsConnecting(false);
//       wsRef.current = null;
//     };

//     wsRef.current = ws;
//     return ws;
//   }, [mockResponse, pushTranscript]);

//   // 🎤 Start session (mic + WS)
//   const startSession = useCallback(async () => {
//     setError(null);
//     let ws: WebSocket | null = null;

//     try {
//       ws = connectWS();
//     } catch (err: any) {
//       setError(String(err?.message || err));
//       return;
//     }

//     // 🎙️ Microphone capture
//     try {
//       const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
//       const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
//         ? 'audio/webm;codecs=opus'
//         : 'audio/webm';
//       const recorder = new MediaRecorder(micStream, { mimeType });
//       mediaRecorderRef.current = recorder;

//       recorder.ondataavailable = async (ev) => {
//         if (ev.data && ev.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
//           try {
//             const arr = await ev.data.arrayBuffer();
//             wsRef.current.send(JSON.stringify({ type: 'audio.chunk', mimeType }));
//             wsRef.current.send(arr);
//           } catch (err) {
//             console.warn('audio chunk send failed', err);
//           }
//         }
//       };

//       recorder.onstart = () => {
//         console.log('🎙️ Recording started');
//         setIsRecording(true);
//       };

//       recorder.onstop = () => {
//         console.log('🛑 Recording stopped');
//         setIsRecording(false);
//       };

//       recorder.start(250); // 250ms chunks
//     } catch (err: any) {
//       console.error('Mic open failed', err);
//       setError('Mic access failed: ' + String(err?.message || err));
//     }
//   }, [connectWS]);

//   // 🛑 Stop session
//   const stopSession = useCallback(async () => {
//     try {
//       const rec = mediaRecorderRef.current;
//       if (rec && rec.state !== 'inactive') rec.stop();

//       if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//         wsRef.current.send(JSON.stringify({ type: 'audio.final' }));
//         const screenshot = captureScreenshot(1000, 0.45);
//         if (screenshot) {
//           wsRef.current.send(JSON.stringify({ type: 'screenshot', data: screenshot }));
//           pushTranscript({
//             speaker: 'system',
//             text: '[Screenshot captured & sent]',
//             isFinal: true,
//             timestamp: Date.now(),
//           });
//         }
//       } else {
//         mockResponse('screen');
//       }
//     } catch (err: any) {
//       console.error('stopSession error', err);
//       setError(String(err?.message || err));
//     } finally {
//       setIsRecording(false);
//     }
//   }, [captureScreenshot, pushTranscript, mockResponse]);

//   // 🧹 Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       try {
//         if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
//         if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
//           mediaRecorderRef.current.stop();
//         if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
//         if (captureVideoRef.current) {
//           captureVideoRef.current.pause();
//           captureVideoRef.current.srcObject = null;
//           captureVideoRef.current.remove();
//           captureVideoRef.current = null;
//         }
//         if (hiddenCanvasRef.current) {
//           hiddenCanvasRef.current.remove();
//           hiddenCanvasRef.current = null;
//         }
//       } catch (err) {
//         console.warn('cleanup error', err);
//       }
//     };
//   }, [screenStream]);

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
// }

// export default useSightSpeak;


