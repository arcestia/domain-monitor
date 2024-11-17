import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
    baseURL: API_URL
});

// Add token to requests if available
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add error handling
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const auth = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    changePassword: (data) => api.post('/auth/change-password', data),
    generateApiToken: () => api.post('/auth/generate-token')
};

export const domains = {
    getAll: () => api.get('/domains'),
    add: (data) => api.post('/domains', data),
    remove: (id) => api.delete(`/domains/${id}`),
    checkDomain: (id) => api.post(`/domains/${id}/check`)
};

export const admin = {
    // Admin's own domain management
    getAdminDomains: () => api.get('/admin/domains'),
    addAdminDomain: (data) => api.post('/admin/domains', data),
    checkAdminDomain: (domainId) => api.post(`/admin/domains/${domainId}/check`),
    removeAdminDomain: (domainId) => api.delete(`/admin/domains/${domainId}`),

    // User management
    getUsers: () => api.get('/admin/users'),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    getUserStats: (id) => api.get(`/admin/users/${id}/stats`),
    checkDomain: (userId, domainId) => api.post(`/admin/users/${userId}/domains/${domainId}/check`),
    generateApiToken: (id) => api.post(`/admin/users/${id}/api-token`),
    revokeApiToken: (id) => api.delete(`/admin/users/${id}/api-token`)
};
