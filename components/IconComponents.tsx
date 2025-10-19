import React from 'react';

export const MicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12 7.5v-1.5a6 6 0 00-6-6v0a6 6 0 00-6 6v1.5m6 7.5a6 6 0 006-6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5v3.75a4.5 4.5 0 01-4.5 4.5s-4.5-2.015-4.5-4.5V8.25z" />
  </svg>
);

export const StopCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563A.563.563 0 019 14.437V9.563z" />
  </svg>
);

export const LoaderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const ScreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
);

export const WaveformIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const bar = "transition-all duration-300 ease-in-out";
    const styles = [
        { animation: 'waveform 1.2s ease-in-out infinite' },
        { animation: 'waveform 1.4s ease-in-out infinite 0.2s' },
        { animation: 'waveform 1.1s ease-in-out infinite 0.3s' },
        { animation: 'waveform 1.3s ease-in-out infinite 0.1s' },
    ];
    return (
        <>
            <style>
                {`@keyframes waveform {
                    0%, 100% { transform: scaleY(0.4); }
                    50% { transform: scaleY(1.0); }
                }`}
            </style>
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" {...props}>
                <rect className={bar} style={styles[0]} x="4" y="6" width="3" height="12" rx="1.5" />
                <rect className={bar} style={styles[1]} x="9" y="6" width="3" height="12" rx="1.5" />
                <rect className={bar} style={styles[2]} x="14" y="6" width="3" height="12" rx="1.5" />
                <rect className={bar} style={styles[3]} x="19" y="6" width="3" height="12" rx="1.5" />
            </svg>
        </>
    );
};