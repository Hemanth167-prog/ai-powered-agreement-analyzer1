import axios from "axios";

// All requests go through the API Gateway - the frontend never talks to
// an individual microservice or the database directly.
const client = axios.create({
  baseURL: "/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      const path = window.location.pathname;
      if (
        !path.startsWith("/login") &&
        !path.startsWith("/register") &&
        !path.startsWith("/forgot-password") &&
        !path.startsWith("/reset-password")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;
