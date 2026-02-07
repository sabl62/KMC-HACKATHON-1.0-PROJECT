import React, { useState, useEffect } from "react";
import { studyPostsAPI, authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./StudyPosts.css";

function StudyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [createError, setCreateError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const user = authAPI.getCurrentUser();

  const [filters, setFilters] = useState({
    subject: "",
    search: "",
    topic: "",
  });

  // Form state for creating new post - FIXED to match backend model
  const [newPost, setNewPost] = useState({
    title: "",
    topic: "",
    description: "",
    subject: "",
  });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await studyPostsAPI.getAll(filters);
      const data = response.data.results || response.data;
      setPosts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Failed to load study posts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPost = async (postId) => {
    try {
      const response = await studyPostsAPI.join(postId);
      const sessionData = response.data.session || response.data;
      navigate(`/chat/${sessionData.id}`, { state: { session: sessionData } });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to join study session");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      // FIXED: Ensure all fields match the backend model exactly
      const postData = {
        title: newPost.title.trim(),
        topic: newPost.topic.trim(),
        description: newPost.description.trim(),
        subject: newPost.subject.trim(),
      };

      console.log("Sending post data:", postData);

      const response = await studyPostsAPI.create(postData);

      console.log("Post created successfully:", response.data);

      // Close modal and reset form
      setShowCreateModal(false);
      setNewPost({
        title: "",
        topic: "",
        description: "",
        subject: "",
      });

      // Refresh the posts list
      await fetchPosts();
    } catch (err) {
      console.error("Error creating post:", err);
      console.error("Error response:", err.response);

      // Extract error message from various possible formats
      let errorMessage = "Failed to create post. Please try again.";

      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else {
          // Handle field-specific errors
          const errors = [];
          Object.keys(err.response.data).forEach((key) => {
            if (Array.isArray(err.response.data[key])) {
              errors.push(`${key}: ${err.response.data[key].join(", ")}`);
            } else {
              errors.push(`${key}: ${err.response.data[key]}`);
            }
          });
          if (errors.length > 0) {
            errorMessage = errors.join(" | ");
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setCreateError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
    setNewPost({
      title: "",
      topic: "",
      description: "",
      subject: "",
    });
  };

  if (loading && posts.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Syncing with Study Mitra...</p>
      </div>
    );
  }

  return (
    <div className="study-posts-container">
      <div className="header-section">
        <div className="title-group">
          <h1>Study Mitra</h1>
          <p>Find your ideal study partner in seconds.</p>
        </div>
        {user && (
          <button
            className="create-post-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span>+</span> Create Post
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Search topics (Press Enter)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="modern-input"
          />
        </div>
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Filter by Subject..."
            value={filters.subject}
            onChange={(e) =>
              setFilters({ ...filters, subject: e.target.value })
            }
            className="modern-input"
          />
        </div>
      </div>

      {error && <div className="error-pill">{error}</div>}

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="no-posts-state">
            <p>No active sessions found. Start a new one!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-row-card">
              {/* LEFT: User Identity */}
              <div className="user-section">
                <div className="avatar-squircle">
                  {post.user?.username
                    ? post.user.username[0].toUpperCase()
                    : "?"}
                </div>
                <div className="user-details">
                  <h3>{post.user?.username || "Anonymous"}</h3>
                  <span className="date-label">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* CENTER: Post Content */}
              <div className="content-section">
                <div className="tag-row">
                  <span className="subject-tag">{post.subject}</span>
                  {post.topic && (
                    <span className="topic-badge">{post.topic}</span>
                  )}
                </div>
                <h2>{post.title}</h2>
                <p className="description-text">{post.description}</p>
              </div>

              {/* RIGHT: Status & CTA */}
              <div className="action-section">
                <div className="status-indicator">
                  {post.active_sessions_count > 0 && (
                    <span className="live-badge">
                      ● {post.active_sessions_count} Active
                    </span>
                  )}
                </div>
                <button
                  className="join-action-btn"
                  onClick={() => handleJoinPost(post.id)}
                >
                  Join Session
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Study Post</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            {createError && (
              <div className="error-pill" style={{ marginBottom: "16px" }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  required
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                  placeholder="e.g., Looking for calculus study partner"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Topic *</label>
                <input
                  type="text"
                  required
                  value={newPost.topic}
                  onChange={(e) =>
                    setNewPost({ ...newPost, topic: e.target.value })
                  }
                  placeholder="e.g., Differential Equations, Photosynthesis, etc."
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  required
                  value={newPost.subject}
                  onChange={(e) =>
                    setNewPost({ ...newPost, subject: e.target.value })
                  }
                  placeholder="e.g., Mathematics, Physics, Biology, etc."
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  required
                  value={newPost.description}
                  onChange={(e) =>
                    setNewPost({ ...newPost, description: e.target.value })
                  }
                  placeholder="Describe what you want to study..."
                  rows="4"
                  disabled={isSubmitting}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyPosts;
