import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  User,
  TriangleAlert,
  Wand2,
  TrendingUp,
  ListChecks,
  AlignLeft,
  Brain,
  BookOpen,
} from 'lucide-react';

export default function ResumeCorrections({ user }) {
  const navigate = useNavigate();

  // Dynamic candidate data with fallbacks
  const candidateName = user?.name || 'Alex Rivers';
  const targetRole = user?.targetRole || 'Senior Full Stack Engineer';
  const atsScore = user?.atsScore || 78;

  const verifiedSkills = user?.currentSkills?.length
    ? user.currentSkills
    : ['React', 'Node.js', 'AWS', 'PostgreSQL', 'TypeScript'];

  const detectedGaps = user?.targetedSkills?.length
    ? user.targetedSkills
    : ['Kubernetes', 'GraphQL', 'System Design', 'Redis'];

  const adviceList = [
    {
      id: 1,
      icon: TrendingUp,
      title: 'Impact Quantification',
      desc: 'Quantify your achievements in your backend and cloud migration bullet points. Specify the percentage latency reduction or cost efficiency achieved.',
    },
    {
      id: 2,
      icon: ListChecks,
      title: 'Highlight Missing Skills',
      desc: 'Integrate concrete production examples or projects involving Kubernetes and GraphQL to bridge the detected ATS skill gap for this target role.',
    },
    {
      id: 3,
      icon: AlignLeft,
      title: 'Consolidate Older Roles',
      desc: 'Reduce the bullet points in projects and roles older than 4 years to maintain clear focus on your most relevant, recent full-stack contributions.',
    },
  ];

  // SVG Gauge Calculations (Radius = 40, Circumference = 2 * PI * 40 ≈ 251.2)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (atsScore / 100) * circumference;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. PROFILE HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {candidateName}
          </h1>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Target: {targetRole}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/questions')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Open Question Bank</span>
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <Brain className="w-4 h-4 text-white" />
            <span>Start AI Mock Interview</span>
          </button>
        </div>
      </div>

      {/* 2. TOP METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: CANDIDATE PROFILE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Candidate Profile</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  EXPERIENCE
                </label>
                <p className="text-sm font-bold text-slate-800">5+ years</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  EDUCATION
                </label>
                <p className="text-sm font-bold text-slate-800">B.E. in Computer Engineering</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  VERIFIED SKILLS
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {verifiedSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ATS MATCH SCORE GAUGE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <h3 className="text-base font-bold text-slate-900 mb-4 self-start">ATS Match Score</h3>
          
          <div className="relative w-32 h-32 my-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                className="text-slate-100"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
              />
              {/* Dynamic Score Fill Circle */}
              <circle
                className="text-blue-600 transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
              />
            </svg>

            {/* Centered Score Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{atsScore}</span>
              <span className="text-[11px] font-bold text-slate-400">/ 100</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium mt-3">
            Strong match for <strong className="text-slate-700">{targetRole}</strong> role.
          </p>
        </div>

        {/* CARD 3: DETECTED SKILL GAPS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <TriangleAlert className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Detected Skill Gaps</h3>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              The following required skills are missing or underrepresented in the current resume:
            </p>

            <div className="flex flex-wrap gap-2">
              {detectedGaps.map((gap, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold"
                >
                  {gap}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-amber-700 font-medium">
            ● Address these in your next interview round.
          </div>
        </div>

      </div>

      {/* 3. LOWER SECTION: AI IMPROVEMENT ADVICE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Improvement Advice</h3>
            <p className="text-xs text-slate-400">Tailored action points from NLP analysis</p>
          </div>
        </div>

        <div className="space-y-4">
          {adviceList.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl flex items-start gap-4 transition-all"
              >
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}