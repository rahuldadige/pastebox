import { configureStore } from "@reduxjs/toolkit";
import fileReducer from "./slice/file/fileSlice.js";
import authReducer from "./slice/auth/authSlice.js";

const isProduction = import.meta.env.PROD;

const store = configureStore({
  reducer: {
    file: fileReducer,
    auth: authReducer
  },
  // Disable devTools in production for security
  devTools: !isProduction,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for non-serializable values (if needed)
      serializableCheck: {
        // Ignore these action types if they contain Dates or other non-serializable values
        ignoredActions: ['file/setFiles', 'auth/setUser'],
      },
    }),
});

export default store;