// client/src/lib/axios.js
import axios from 'axios';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAdminApi = url.startsWith('/api/admin');

  // กันตอน build / SSR
  if (typeof window === 'undefined') {
    return config;
  }

  const userToken = localStorage.getItem(USER_TOKEN_KEY);
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!config.headers) {
    config.headers = {};
  }

  if (isAdminApi) {
    // request /api/admin/* ใช้ adminToken
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    // request ปกติใช้ userToken
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
  }

  return config;
});

/**
 * อัปโหลดไฟล์พร้อม progress (ใช้ใน Profile.jsx)
 */
export async function uploadWithProgress({
  url,
  file,
  fieldName = 'file',
  onProgress,
  extraData = {},
  method = 'post',
  headers = {},
}) {
  const form = new FormData();
  form.append(fieldName, file);
  Object.entries(extraData).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      form.append(k, v);
    }
  });

  const res = await api.request({
    url,
    method,
    data: form,
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (evt) => {
      if (!onProgress || !evt.total) return;
      const percent = Math.round((evt.loaded * 100) / evt.total);
      onProgress(percent);
    },
  });

  return res.data;
}

/**
 * ใช้โดย NotificationBell.jsx
 */
export const NotificationService = {
  async getUnreadCount() {
    try {
      const res = await api.get('/api/notifications/unread-count');
      return res?.data?.count ?? 0;
    } catch (err) {
      console.error('getUnreadCount error', err);
      return 0;
    }
  },

  async getNotifications() {
    try {
      const res = await api.get('/api/notifications');
      return res?.data ?? [];
    } catch (err) {
      console.error('getNotifications error', err);
      return [];
    }
  },
};

export default api;
