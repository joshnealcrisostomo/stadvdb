import axios from 'axios';

const api = axios.create({
    baseURL: '/api' 
});

// This function runs BEFORE every request is sent
api.interceptors.request.use(
    (config) => {
        // 1. Get the ID from storage
        const userId = localStorage.getItem('userId');

        // 2. If it exists, attach it to the headers
        if (userId) {
            config.headers['x-customer-id'] = userId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;