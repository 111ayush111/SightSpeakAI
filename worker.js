self.onmessage = (e) => {
  if (e.data.type === 'start' && e.data.stream) {
    const video = document.createElement('video');
    video.srcObject = e.data.stream;
    video.muted = true;
    video.play().then(() => {
      const captureFrame = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.convertToBlob().then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                self.postMessage({ type: 'frame', frame: reader.result?.toString().split(',')[1] });
              };
              reader.readAsDataURL(blob);
            });
          }
        }
        requestAnimationFrame(captureFrame); // Continuous capture
      };
      captureFrame();
    });
  } else if (e.data.type === 'capture') {
    // Trigger immediate capture if requested
    const video = document.querySelector('video');
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.convertToBlob().then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            self.postMessage({ type: 'frame', frame: reader.result?.toString().split(',')[1] });
          };
          reader.readAsDataURL(blob);
        });
      }
    }
  } else if (e.data.type === 'stop') {
    self.close(); // Clean up worker
  }
};