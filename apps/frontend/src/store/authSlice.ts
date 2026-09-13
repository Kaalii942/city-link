import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const savedAccessToken = localStorage.getItem('accessToken');
const savedRefreshToken = localStorage.getItem('refreshToken');
const savedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedAccessToken || null,
  refreshToken: savedRefreshToken || null,
  isAuthenticated: !!savedAccessToken
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    },
    updateAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      localStorage.setItem('accessToken', action.payload);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }
});

export const { setCredentials, updateAccessToken, logout } = authSlice.actions;
export default authSlice.reducer;
