import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

function getToken() {
  return sessionStorage.getItem("token");
}

function ProtectedRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" />;
}

export default function App() {
  const [token, setToken] = useState(getToken());

  const handleLogin = () => {
    setToken(getToken());
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard token={token} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
