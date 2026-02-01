// src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { registerUser, loginUser,updateUser,deleteUser, getUser } from './authThunk';
const stored = localStorage.getItem('user');
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored ? JSON.parse(stored) : null,
    isLoggedIn: !!stored,
    loading: false,
    error: null,
  },
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.isLoggedIn = false;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    loadUserFromStorage: (state) => {
      const stored = localStorage.getItem('user');
      if (stored) {
        state.user = JSON.parse(stored);
        state.isLoggedIn = true;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // REGISTER - Note: Registration doesn't log the user in, just creates the account
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        // Registration successful - don't set user or isLoggedIn
        // User needs to log in separately after registration
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })

      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;        
        state.user = action.payload.user;
        state.isLoggedIn = true;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        // Store the JWT token separately for API calls
        if (action.payload.token) {
          localStorage.setItem('token', action.payload.token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Update failed';
      })
      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isLoggedIn = false;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Delete failed';
      })
      // getUser
      .addCase(getUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Get user failed';
      });
  }
});

export const { logoutUser, loadUserFromStorage } = authSlice.actions;
export default authSlice.reducer;
