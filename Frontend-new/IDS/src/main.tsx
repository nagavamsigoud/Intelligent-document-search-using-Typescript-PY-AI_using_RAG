  import React from "react";
  import ReactDOM from "react-dom/client";
  import { Provider } from "react-redux";
  import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
  import DashboardPage from "./pages/DashboardPage";
  import LoginPage from "./pages/LoginPage";
  import RegisterPage from "./pages/RegisterPage";
  import { store } from "./store/store";
  import "./index.css";

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    </React.StrictMode>,
  );
