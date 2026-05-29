import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://api.mheku.fyi/api';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'dt_0a035ce6d82e444cb95f35a0db44d1da656c65f1260d4e5cb49a0c976b12f25d',
  },
});

// Auto-attach JWT token to every request
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

export default client;