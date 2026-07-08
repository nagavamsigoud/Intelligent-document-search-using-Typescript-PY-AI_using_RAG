import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/client";

type LoginPayload = {
  username: string;
  password: string;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

type TokenResponse = {
  access: string;
  refresh: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "authenticated" | "failed" | "registered";
  error: string | null;
};

const token = localStorage.getItem("accessToken");

const initialState: AuthState = {
  accessToken: token,
  refreshToken: localStorage.getItem("refreshToken"),
  // 👇 If a token exists in localStorage, set status to authenticated right away!
  status: token ? "authenticated" : "idle", 
  error: null,
};

export const login = createAsyncThunk<TokenResponse, LoginPayload>(
  "auth/login",
  async (credentials) => {
    const response = await authApi.post<TokenResponse>("/token/", credentials);
    return response.data;
  },
);

export const register = createAsyncThunk<void, RegisterPayload>(
  "auth/register",
  async (payload) => {
    await authApi.post("/register/", payload);
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        localStorage.setItem("accessToken", action.payload.access);
        localStorage.setItem("refreshToken", action.payload.refresh);
      })
      .addCase(login.rejected, (state) => {
        state.status = "failed";
        state.error = "Invalid username or password.";
      })
      .addCase(register.fulfilled, (state) => {
        state.status = "registered";
        state.error = null;
      })
      .addCase(register.rejected, (state) => {
        state.status = "failed";
        state.error = "Registration failed.";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
