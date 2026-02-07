import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import StudyPosts from "./components/StudyPosts";
import ChatRoom from "./components/ChatRoom";
import Login from "./components/Login";
import Signup from "./components/SignUp";
import Sidebar from "./components/SideBar";
import Profile from "./components/Profile";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("access_token");
    const loggedIn = localStorage.getItem("is_logged_in");
    return !!token && loggedIn === "true";
  });

  const [username, setUsername] = useState("");

  useEffect(() => {
    const syncAuthState = () => {
      const token = localStorage.getItem("access_token");
      const loggedIn = localStorage.getItem("is_logged_in");
      const userData = localStorage.getItem("user");

      setIsAuthenticated(!!token && loggedIn === "true");

      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          // Adjust based on your API's response structure
          setUsername(parsed.username || parsed.name || "User");
        } catch {
          setUsername(userData);
        }
      }
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUsername("");
  };

  return (
    <Router>
      <div className="App">
        {/* NAVBAR */}
        {isAuthenticated && (
          <nav className="app-navbar">
            <div className="nav-left">
              <Link to="/" style={{ textDecoration: "none" }}>
                <span className="logo">Study Mitra</span>
              </Link>
            </div>

            <div className="nav-center">
              <span className="welcome-text">
                Welcome, <span className="user-highlight">{username}</span>
              </span>
            </div>

            <div className="nav-right">
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </nav>
        )}

        <div className="main-layout">
          {isAuthenticated && <Sidebar />}

          <main className="content-area">
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  !isAuthenticated ? (
                    <Login onLoginSuccess={() => setIsAuthenticated(true)} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/signup"
                element={
                  !isAuthenticated ? <Signup /> : <Navigate to="/" replace />
                }
              />

              {/* Protected Routes - These must match the 'to' props in Sidebar.jsx */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <StudyPosts />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/profile"
                element={
                  isAuthenticated ? (
                    <Profile username={username} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/exams"
                element={
                  isAuthenticated ? (
                    <div style={{ padding: "2rem" }}>
                      <h2>Exam Preparation</h2>
                      <p>Practice tests and materials.</p>
                    </div>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/challenges"
                element={
                  isAuthenticated ? (
                    <div style={{ padding: "2rem" }}>
                      <h2>Micro Challenges</h2>
                      <p>Daily tasks to boost your skills.</p>
                    </div>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/chat/:sessionId"
                element={
                  isAuthenticated ? (
                    <ChatRoom />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
