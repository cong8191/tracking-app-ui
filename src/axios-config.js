import axios from 'axios';
import { App as CapApp } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// --- BIẾN QUẢN LÝ TIẾN TRÌNH TOÀN CỤC ---
let activeRequests = 0;
let wakeLock = null;

// Kích hoạt Wake Lock khi có ít nhất 1 request đang xử lý
const acquireWakeLock = async () => {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('🔒 Global Axios Interceptor: Wake Lock Activated');
    }
  } catch (e) {
    console.log('Wake Lock Error:', e);
  }
};

// Giải phóng Wake Lock khi tất cả request đã hoàn tất
const releaseWakeLock = async () => {
  try {
    if (wakeLock && activeRequests === 0) {
      await wakeLock.release();
      wakeLock = null;
      console.log('🔓 Global Axios Interceptor: Wake Lock Released');
    }
  } catch (e) {
    console.log('Wake Lock Release Error:', e);
  }
};

// Lắng hệ thống iOS chuyển App / Tab khi đang có request ngầm
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && activeRequests > 0) {
      acquireWakeLock();
    }
  });

  try {
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        // Khi vuốt về Home hoặc chuyển App khác trên iOS
        const isUploading = typeof window !== 'undefined' && window.isUploadingActive;
        if (activeRequests > 0 || isUploading) {
          try {
            const taskId = await BackgroundTask.beforeExit(async () => {
              console.log('📱 Official iOS Native Background Task engaged');
              let checkCount = 0;
              // Giữ luồng CPU & Mạng Native của iOS chạy liên tục cho tới khi toàn bộ file/chunk upload xong (tối đa 150s)
              while ((activeRequests > 0 || (typeof window !== 'undefined' && window.isUploadingActive)) && checkCount < 300) {
                await new Promise((r) => setTimeout(r, 500));
                checkCount++;
              }
              BackgroundTask.finish({ taskId });
              console.log('📱 Official iOS Native Background Task completed');
            });
          } catch (err) {
            console.log('Background task error:', err);
          }
        }
      } else {
        // Khi quay lại màn hình chính của App
        if (activeRequests > 0 || (typeof window !== 'undefined' && window.isUploadingActive)) {
          acquireWakeLock();
        }
      }
    });
  } catch (e) {
    // Môi trường Web thuần
  }
}

// --- INTERCEPTOR REQUEST ---
instance.interceptors.request.use(
  async (config) => {
    activeRequests++;
    if (activeRequests === 1) {
      await acquireWakeLock();
    }
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      releaseWakeLock();
    }
    return Promise.reject(error);
  }
);

// --- INTERCEPTOR RESPONSE & TỰ ĐỘNG THỬ LẠI KHI MẠNG TRỜI NỀN ---
instance.interceptors.response.use(
  async (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      await releaseWakeLock();
    }
    return response;
  },
  async (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      await releaseWakeLock();
    }

    const config = error.config;
    // CHỈ auto-retry cho GET requests hoặc Upload Chunk có flowIdentifier (an toàn không bị trùng lặp dữ liệu)
    // KHÔNG tự động retry POST requests thông thường để tránh bị nhân đôi dữ liệu trên Server
    const isGet = config?.method?.toLowerCase() === 'get';
    const isChunkUpload = config?.url?.includes('/upload') && config?.data instanceof FormData;

    if (config && (isGet || isChunkUpload) && (!error.response || error.response.status >= 500)) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 3) {
        config._retryCount += 1;
        console.log(`🔄 iOS Interceptor Retry attempt #${config._retryCount} for: ${config.url}`);
        await new Promise((r) => setTimeout(r, 2000 * config._retryCount));
        return instance(config);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;