import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://pastebox.onrender.com/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 60000, // 60 second timeout (Render free tier can have cold starts)
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (let browser handle it)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error - server may be unavailable');
      error.message = 'Network error. Please check your connection.';
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    
    // Handle token expiration
    if (status === 401) {
      const errorCode = data?.code;
      
      // Only clear auth and redirect for token-related issues
      if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Only redirect if not already on login page or public routes
        const publicRoutes = ['/login', '/signup', '/f/', '/g/', '/s/'];
        const isPublicRoute = publicRoutes.some(route => window.location.pathname.includes(route));
        
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle rate limiting
    if (status === 429) {
      error.message = data?.error || 'Too many requests. Please wait and try again.';
    }
    
    // Handle server errors
    if (status >= 500) {
      error.message = 'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;