import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "@/store/store";
import { setCredentials, clearCredentials } from "@/store/slices/authSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Створюємо axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - додає токен до кожного запиту
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - автоматично оновлює токен при 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = store.getState().auth.refreshToken;

      if (!refreshToken) {
        store.dispatch(clearCredentials());
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, user } = response.data;

        store.dispatch(setCredentials({ accessToken, user }));

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(clearCredentials());
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post("/auth/login", credentials),

  register: (userData: any) => api.post("/auth/register", userData),

  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),

  refreshToken: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),

  getCurrentUser: () => api.get("/auth/me"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", data),
};

// Books API
export const booksAPI = {
  getAll: (page = 1, limit = 20) =>
    api.get(`/books?page=${page}&limit=${limit}`),

  getOne: (id: string) => api.get(`/books/${id}`),

  search: (query: string, page = 1, limit = 20) =>
    api.get(`/books/search?q=${query}&page=${page}&limit=${limit}`),

  getPopular: (limit = 10) => api.get(`/books/popular?limit=${limit}`),

  create: (data: any) => api.post("/books", data),

  update: (id: string, data: any) => api.put(`/books/${id}`, data),

  delete: (id: string) => api.delete(`/books/${id}`),

  // Створення книги з файлом (FormData)
  createWithImage: (formData: FormData) =>
    api.post("/books", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  // Оновлення книги з файлом (FormData)
  updateWithImage: (id: string, formData: FormData) =>
    api.put(`/books/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};

// Loans API
export const loansAPI = {
  borrow: (bookId: string) => api.post("/loans/borrow", { bookId }),

  return: (loanId: string) => api.post(`/loans/${loanId}/return`),

  extend: (loanId: string, days: number) =>
    api.patch(`/loans/${loanId}/extend`, { days }),

  getMy: (status?: string) =>
    api.get(`/loans/my${status ? `?status=${status}` : ""}`),

  getAll: (page = 1, limit = 20, status?: string) =>
    api.get(
      `/loans?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`
    ),

  getStatistics: () => api.get("/loans/statistics"),
};

// Reservations API
export const reservationsAPI = {
  create: (bookId: string) => api.post("/reservations", { bookId }),

  getMy: (status?: string) =>
    api.get(`/reservations/my${status ? `?status=${status}` : ""}`),

  cancel: (id: string) => api.delete(`/reservations/${id}`),

  getAll: (page = 1, limit = 20, status?: string) =>
    api.get(
      `/reservations?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
    ),

  updateStatus: (id: string, status: string) =>
    api.patch(`/reservations/${id}/status`, { status }),
};

// Reviews API
export const reviewsAPI = {
  create: (data: { bookId: string; rating: number; comment?: string }) =>
    api.post("/reviews", data),

  getMy: () => api.get("/reviews/my"),

  getBookReviews: (bookId: string, page = 1, limit = 10) =>
    api.get(`/reviews/book/${bookId}?page=${page}&limit=${limit}`),

  update: (id: string, data: any) => api.put(`/reviews/${id}`, data),

  delete: (id: string) => api.delete(`/reviews/${id}`),
};

// Fines API
export const finesAPI = {
  getMy: (status?: string) =>
    api.get(`/fines/my${status ? `?status=${status}` : ""}`),

  pay: (id: string) => api.post(`/fines/${id}/pay`),

  getStatistics: () => api.get("/fines/statistics"),
};

// Statistics API
export const statisticsAPI = {
  getDashboard: () => api.get("/statistics/dashboard"),

  getPopularGenres: (limit = 10) =>
    api.get(`/statistics/popular-genres?limit=${limit}`),

  getMonthly: (months = 6) => api.get(`/statistics/monthly?months=${months}`),

  getTopReaders: (limit = 10) =>
    api.get(`/statistics/top-readers?limit=${limit}`),

  getOverdueBooks: () => api.get("/statistics/overdue-books"),
};

// Recommendations API
export const recommendationsAPI = {
  getPersonal: (limit = 10) =>
    api.get(`/recommendations/personal?limit=${limit}`),

  getSimilar: (bookId: string, limit = 5) =>
    api.get(`/recommendations/similar/${bookId}?limit=${limit}`),

  getTrending: (limit = 10) =>
    api.get(`/recommendations/trending?limit=${limit}`),
};

// Users API
export const usersAPI = {
  getAll: (page = 1, limit = 20) =>
    api.get(`/users?page=${page}&limit=${limit}`),

  getProfile: () => api.get("/users/profile"),

  updateProfile: (data: any) => api.put("/users/profile", data),
};
