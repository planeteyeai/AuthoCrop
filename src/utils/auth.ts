// Authentication utility functions
export const AUTH_TOKEN_KEY = 'token';
export const USER_ROLE_KEY = 'role';
export const USER_DATA_KEY = 'userData';
export const IS_AUTHENTICATED_KEY = 'isAuthenticated';

// Get authentication token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Set authentication token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

// Remove authentication token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return token !== null && token !== '';
};

// Get user role from localStorage
export const getUserRole = (): string | null => {
  return localStorage.getItem(USER_ROLE_KEY);
};

// Set user role in localStorage
export const setUserRole = (role: string): void => {
  localStorage.setItem(USER_ROLE_KEY, role);
};

// Remove user role from localStorage
export const removeUserRole = (): void => {
  localStorage.removeItem(USER_ROLE_KEY);
};

// Get user data from localStorage
export const getUserData = (): any => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

// Set user data in localStorage
export const setUserData = (userData: any): void => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
};

// Remove user data from localStorage
export const removeUserData = (): void => {
  localStorage.removeItem(USER_DATA_KEY);
};

// Clear all authentication data
export const clearAuthData = (): void => {
  removeAuthToken();
  removeUserRole();
  removeUserData();
  localStorage.removeItem(IS_AUTHENTICATED_KEY);
};

// Set all authentication data after successful login
export const setAuthData = (token: string, role: string, userData?: any): void => {
  setAuthToken(token);
  setUserRole(role);
  if (userData) {
    setUserData(userData);
  }
  localStorage.setItem(IS_AUTHENTICATED_KEY, 'true');
};

// Get authorization header for API calls
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Validate token format (basic validation)
export const isValidToken = (token: string): boolean => {
  return token && token.length > 0 && token.includes('.');
};
