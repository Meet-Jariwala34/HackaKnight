import React, { useState } from 'react';
import axios from 'axios';
import { FileText, User, Eye, Rocket, Loader2 } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Form Submission (Sign In or Sign Up)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const endpoint = isSignUp ? '/signup' : '/login';
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const response = await axios.post(`http://localhost:5000/api/auth${endpoint}`, payload, {
        withCredentials: true // For Refresh Token cookie
      });

      // Save short-lived Access Token in sessionStorage / localStorage
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (onLoginSuccess) {
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Hackathon Judges One-Click Demo Login
  const handleDemoLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/demo-login', {}, {
        withCredentials: true
      });

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (onLoginSuccess) {
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setErrorMsg('Demo login failed. Ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-[#F8FAFC] font-sans antialiased text-[#0F172A]">
      
      {/* 1. LEFT BRANDING PANEL */}
      <section className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#0C4A6E] relative flex-col justify-between p-16 text-white overflow-hidden">
        
        {/* Glowing Background Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-blue-600/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-4 mb-14">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-[0_0_25px_rgba(37,99,235,0.6)]">
                H
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">HackaKnight</h1>
            </div>

            {/* Title & Pitch */}
            <div className="mb-12">
              <h2 className="text-4xl font-extrabold leading-tight mb-4">
                Automated Resume Parser & <br />
                <span className="text-sky-400">AI Mock Interviewer</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-lg">
                Streamline your recruitment process with intelligent parsing, real-time skill matching, and realistic interview simulations.
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-col gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-sky-400 flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Intelligent Resume Parsing</h3>
                  <p className="text-slate-300 text-sm leading-snug">
                    Extract skills, experience, and education with high accuracy using our advanced NLP models.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-sky-400 flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">AI Mock Interviews</h3>
                  <p className="text-slate-300 text-sm leading-snug">
                    Conduct role-specific technical and behavioral interviews powered by generative AI.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-sky-400 flex-shrink-0">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Skill Gap Analysis</h3>
                  <p className="text-slate-300 text-sm leading-snug">
                    Identify deficiencies between candidate profiles and job requirements in seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="text-slate-400 text-sm pt-8">
            © 2026 HackaKnight Platform. All rights reserved.
          </div>
        </div>
      </section>

      {/* 2. RIGHT LOGIN / SIGNUP FORM PANEL */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-[#F8FAFC]">
        <div className="w-full max-w-lg">
          
          <div className="mb-8">
            <h3 className="text-4xl font-extrabold text-slate-900">
              {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </h3>
            <p className="text-slate-500 text-base mt-2">
              {isSignUp ? 'Sign up to start parsing and rehearsing.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.06)] border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {isSignUp && (
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 tracking-wider uppercase mb-2">
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Meet Jariwala"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-xl text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-600 tracking-wider uppercase mb-2">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 border border-slate-300 rounded-xl text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold text-slate-600 tracking-wider uppercase">
                    PASSWORD
                  </label>
                  {!isSignUp && (
                    <a href="#" className="text-sm font-bold text-blue-600 hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 border border-slate-300 rounded-xl text-base outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>

            <div className="text-center text-slate-500 text-sm mt-6">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
                className="font-bold text-blue-600 hover:underline ml-1"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>

          {/* Judges / Demo Card */}
          <div className="mt-8 bg-slate-100 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Hackathon Judges</h4>
              <p className="text-xs text-slate-500 mt-0.5">Access the pre-populated demo environment.</p>
            </div>
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              type="button"
              className="bg-white border border-slate-300 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm text-slate-900 shadow-sm flex items-center gap-2 transition-all"
            >
              <Rocket className="w-4 h-4 text-blue-600" />
              Demo login
            </button>
          </div>

        </div>
      </section>

    </div>
  );
}