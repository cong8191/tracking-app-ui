import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';

// --- BẮT LỖI TOÀN CỤC ---
// Thêm đoạn code này để bắt lỗi và hiển thị qua alert
window.onerror = function (message, source, lineno, colno, error) {
  alert(`[JavaScript Error]\nMessage: ${message}\nSource: ${source}\nLine: ${lineno}, Col: ${colno}\nError: ${error}`);
  return false; // Ngăn trình duyệt hiển thị lỗi mặc định
};

window.addEventListener('unhandledrejection', function (event) {
  alert(`[Unhandled Promise Rejection]\nReason: ${event.reason}`);
});
// --- KẾT THÚC PHẦN BẮT LỖI ---

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
