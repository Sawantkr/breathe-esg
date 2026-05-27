import { Link, useNavigate } from "react-router-dom";

import { useState } from "react";

import axios from "axios";

import {
  signInWithPopup
} from "firebase/auth";

import {
  auth,
  provider
} from "../firebase/firebase";


import { API_BASE } from "../utils/api";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");


  // NORMAL LOGIN

  const handleLogin = async () => {

    try {

      const response = await axios.post(

        `${API_BASE}/auth/login/`,

        {
          username,
          password
        }
      );

      localStorage.setItem(
        "token",
        "esg-user"
      );

      localStorage.setItem(
        "username",
        response.data.username
      );

      localStorage.setItem(
        "email",
        response.data.email
      );

      localStorage.setItem(
        "organization",
        response.data.organization_name || "Default Organization"
      );

      navigate("/dashboard");

    } catch (error) {

      console.log(error);

      alert("Invalid credentials");
    }
  };


  // GOOGLE LOGIN

  const handleGoogleLogin =
    async () => {

      try {

        const result =
          await signInWithPopup(
            auth,
            provider
          );

        const user =
          result.user;


        // SAVE USER TO DJANGO + POSTGRESQL

        const googleResponse = await axios.post(

          `${API_BASE}/auth/google-login/`,

          {
            username: user.displayName,
            email: user.email,
            organization_name: "Default Organization"
          }
        );


        // LOCAL STORAGE

        localStorage.setItem(
          "token",
          user.accessToken
        );

        localStorage.setItem(
          "username",
          user.displayName
        );

        localStorage.setItem(
          "email",
          user.email
        );

        localStorage.setItem(
          "organization",
          googleResponse.data.organization_name || "Default Organization"
        );

        localStorage.setItem(
          "profilePic",
          user.photoURL
        );


        navigate("/dashboard");

      } catch (error) {

        console.log(error);

        alert("Google Login Failed");
      }
    };



  return (

    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">

      {/* Background */}

      <img
        src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />


      {/* Overlay */}

      <div className="absolute inset-0 bg-black/75"></div>


      {/* Glow */}

      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl"></div>

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl"></div>


      {/* Login Card */}

      <div className="relative z-10 w-[420px] bg-black/60 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">


        {/* Logo */}

        <h1 className="text-5xl font-black text-center mb-10 tracking-wide">

          <span className="text-cyan-400">
            ESG
          </span>

          <span className="text-white">
            HUB
          </span>

        </h1>


        {/* Title */}

        <h2 className="text-white text-4xl font-bold mb-8">

          Sign In

        </h2>


        {/* Inputs */}

        <div className="space-y-5">

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            className="w-full bg-zinc-800/90 text-white p-4 rounded-xl outline-none border border-zinc-700 focus:border-cyan-400 transition-all duration-300"
          />


          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full bg-zinc-800/90 text-white p-4 rounded-xl outline-none border border-zinc-700 focus:border-cyan-400 transition-all duration-300"
          />


          {/* Forgot */}

          <p className="text-gray-400 text-sm hover:text-white cursor-pointer transition">

            Forgot your password?

          </p>


          {/* Login Button */}

          <button
            onClick={handleLogin}
            className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
          >

            Sign In

          </button>


          {/* Divider */}

          <div className="flex items-center gap-4 py-2">

            <div className="flex-1 h-[1px] bg-zinc-700"></div>

            <p className="text-gray-400 text-sm">

              OR

            </p>

            <div className="flex-1 h-[1px] bg-zinc-700"></div>

          </div>


          {/* GOOGLE LOGIN BUTTON */}

          <button
            onClick={handleGoogleLogin}
            className="w-full border border-zinc-700 hover:border-cyan-400 text-white py-4 rounded-xl font-semibold transition-all duration-300 bg-zinc-900/60 hover:bg-zinc-800"
          >

            Continue with Google

          </button>

        </div>


        {/* Signup */}

        <p className="text-gray-400 text-center mt-8">

          New to ESG HUB?

          <Link
            to="/signup"
            className="text-white font-semibold ml-2 hover:text-cyan-400"
          >

            Sign up now

          </Link>

        </p>

      </div>

    </div>
  );
}

export default Login;