import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Use EXPO_PUBLIC_API_URL which already includes /api
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://expense-tracker-api-td.onrender.com/api';

console.log('API URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 second timeout for cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// Retry logic for cold starts
const retryRequest = async (config: AxiosRequestConfig, retries = 1): Promise<any> => {
  try {
    return await axios(config);
  } catch (error) {
    if (retries > 0 && (error as AxiosError).code === 'ECONNABORTED') {
      console.log(`Request timeout, retrying... (${retries} retries left)`);
      return retryRequest(config, retries - 1);
    }
    throw error;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle timeout errors (cold start)
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('Request timeout (possible cold start), retrying...');
      return api(originalRequest);
    }

    // Handle specific HTTP errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          error.message = 'Session expired. Please login again.';
          break;
        case 404:
          error.message = data?.detail || 'Resource not found';
          break;
        case 422:
          // Validation error
          error.message = data?.detail?.[0]?.msg || data?.detail || 'Validation error';
          break;
        case 500:
          error.message = 'Server error. Please try again later.';
          break;
        default:
          error.message = data?.detail || data?.message || 'An error occurred';
      }
    } else if (error.request) {
      // Network error
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Server may be starting up, please try again.';
      } else {
        error.message = 'Network error. Please check your connection.';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
