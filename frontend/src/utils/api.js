import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

const pendingRequestControllers = new Set();

export function cancelPendingRequests() {
  pendingRequestControllers.forEach((controller) => controller.abort());
  pendingRequestControllers.clear();
}

function releaseRequest(config) {
  const controller = config?._trackingAbortController;
  if (controller) pendingRequestControllers.delete(controller);
}

// Request interceptor: add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      if (!config.signal) {
        const controller = new AbortController();
        config.signal = controller.signal;
        config._trackingAbortController = controller;
        pendingRequestControllers.add(controller);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 errors
api.interceptors.response.use(
  (response) => {
    releaseRequest(response.config);
    return response;
  },
  (error) => {
    releaseRequest(error.config);
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      cancelPendingRequests();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
