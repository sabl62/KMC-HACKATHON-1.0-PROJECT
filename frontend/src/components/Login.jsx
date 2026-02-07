// frontend/src/components/Login.jsx
import React, { useEffect, useState } from "react";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./login.css";

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 🔒 Auto-login if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const isLoggedIn = localStorage.getItem("is_logged_in");

    if (token && isLoggedIn === "true") {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authAPI.login(formData);

      const token = data?.access || data?.data?.access || data?.token;

      const user = {
        id: data?.id || data?.user?.id || data?.user_id,
        username: data?.username || data?.user?.username || formData.username,
      };

      if (!token) {
        throw new Error("No access token received");
      }

      // ✅ Persist EVERYTHING needed
      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("is_logged_in", "true");

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.detail ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div>
        <h2>Login to Study Mitra</h2>

        {error && <p>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({
                ...formData,
                username: e.target.value,
              })
            }
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
