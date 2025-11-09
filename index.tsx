// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App.tsx';

// const rootElement = document.getElementById('root');
// if (!rootElement) {
//   throw new Error("Could not find root element to mount to");
// }

// const root = ReactDOM.createRoot(rootElement);
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Remove ImportMeta interface extension from here.
// Move ImportMeta augmentation to a .d.ts file (see below).

declare global {
  var __REACT_ROOT__: ReactDOM.Root | null;
}

let root: ReactDOM.Root | null = globalThis.__REACT_ROOT__;

const container = document.getElementById('root');

// Only create a new root if one does not already exist
if (!root) {
  if (container) {
    root = ReactDOM.createRoot(container);
    globalThis.__REACT_ROOT__ = root;
    console.log('Created new React root');
  } else {
    throw new Error('Root container (#root) not found');
  }
} else {
  console.log('Reusing existing React root');
}

if (root) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Rendered app');
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (root) {
      root.unmount();
      globalThis.__REACT_ROOT__ = null;
      console.log('HMR disposed, root unmounted');
    }
  });
}