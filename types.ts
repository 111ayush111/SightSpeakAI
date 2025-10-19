export interface TranscriptMessage {
  speaker: 'user' | 'ai';
  text: string;
  isFinal: boolean;
}
