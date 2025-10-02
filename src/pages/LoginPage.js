import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../api";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";

export default function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (username, password, setError) => {
    setLoading(true);
    setError("");
    try {
      const res = await loginUser(username, password);
      if (!res.token) {
        setError(res.message || "Login failed. Please check your credentials.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("username", res.username);
      if (typeof onLogin === "function") onLogin();
      navigate("/");
    } catch (err) {
      setError("Error: " + (err.message || err));
    }
    setLoading(false);
  };

  const handleRegister = async (username, email, password, setError) => {
    setLoading(true);
    setError("");
    try {
      const res = await registerUser(username, email, password);
      if (res.error || res.status === "error" || res.status === 400 || res.status === 409) {
        setError(res.message || res.error || "Registration failed.");
        setLoading(false);
        return;
      }
      setMessage("Registered successfully! Please login.");
      setIsRegister(false);
    } catch (err) {
      setError("Error: " + (err.message || err));
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isRegister ? "Register" : "Login"}
        </h2>
        {message && (
          <div className="mb-3 text-center text-green-600 text-sm">{message}</div>
        )}
        {isRegister ? (
          <RegisterForm onRegister={handleRegister} loading={loading} />
        ) : (
          <LoginForm onLogin={handleLogin} loading={loading} />
        )}
        <div className="text-center text-sm mt-3">
          {isRegister ? (
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => { setIsRegister(false); setMessage(""); }}
            >
              Already have an account? Login
            </span>
          ) : (
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => { setIsRegister(true); setMessage(""); }}
            >
              Don't have an account? Sign Up
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
