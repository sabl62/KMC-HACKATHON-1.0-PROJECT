// frontend/src/components/Signup.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/auth/register/", form);
      alert("Account created successfully! Please login.");
      navigate("/login");
    } catch (err) {
      alert("Signup failed. Check your details.");
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          onChange={handleChange}
          required
        />
        <input name="email" placeholder="Email" onChange={handleChange} />
        <input
          name="first_name"
          placeholder="First Name"
          onChange={handleChange}
        />
        <input
          name="last_name"
          placeholder="Last Name"
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}

export default Signup;
