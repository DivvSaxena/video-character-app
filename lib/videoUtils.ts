export function validateVideoFile(file: File): Promise<{ valid: boolean; duration?: number; error?: string }> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve({ valid: false, error: 'File must be a video' });
        return;
      }
  
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        if (video.duration > 12) {
          resolve({ valid: false, error: 'Video must be 10 seconds or less' });
        } else {
          resolve({ valid: true, duration: video.duration });
        }
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        resolve({ valid: false, error: 'Invalid video file' });
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
  
  export function createVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnail);
        } else {
          reject(new Error('Could not get canvas context'));
        }
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('Could not load video'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
  