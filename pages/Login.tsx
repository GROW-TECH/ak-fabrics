/// <reference types="vite/client" />

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const body = isRegistering ? { email, password, name } : { email, password };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      // ✅ Use auth context login method
      login(data.token, data.shop.id.toString());

      navigate("/");

    } catch (err: any) {
      setError(err.message || "Server error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-6">
          AK Fabrics {isRegistering ? "Register" : "Login"}
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <input
              type="text"
              placeholder="Shop Name"
              className="w-full border p-2 rounded-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? (isRegistering ? "Registering..." : "Logging in...") : (isRegistering ? "Register" : "Login")}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            className="text-indigo-600 hover:underline text-sm"
          >
            {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
          </button>
        </div>

        {!isRegistering && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <p className="font-semibold mb-1">Test Credentials (if available):</p>
            <p>Email: test@akfabrics.com</p>
            <p>Password: test123</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;