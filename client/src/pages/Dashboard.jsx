import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  TriangleAlert,
  BrainCircuit,
  BadgeCheck,
  FileText,
  CircleCheck,
  CircleAlert,
  Info,
  Mic,
  ArrowRight,
  Clock3,
} from 'lucide-react';

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  // Dynamic user data with sensible fallbacks
  const candidateSkills = user?.currentSkills?.length
    ? user.currentSkills
    : ['React.js', 'TypeScript', 'Node.js', 'REST APIs', 'Git'];

  const missingSkills = user?.targetedSkills?.length
    ? user.targetedSkills
    : [
        {
          name: 'GraphQL',
          level: 'danger',
          desc: 'Frequently requested for Senior Frontend roles. Consider adding this skill set to your resume.',
        },
        {
          name: 'Docker',
          level: 'info',
          desc: 'Mentioned in previous roles but not explicitly listed in Skills section.',
        },
      ];

  const recommendedJobs = [
    {
      id: 1,
      title: 'Senior Frontend Engineer',
      match: '92% Match',
      company: 'TechCorp Inc. • Remote',
      tags: ['React', 'TypeScript'],
    },
    {
      id: 2,
      title: 'Fullstack Developer',
      match: '85% Match',
      company: 'Innovate Solutions • New York (Hybrid)',
      tags: ['React', 'Node.js'],
    },
    {
      id: 3,
      title: 'React Developer',
      match: '81% Match',
      company: 'Digital Labs • Remote',
      tags: ['React', 'REST APIs'],
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. PAGE HEADING */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          HackaKnight Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here is your current candidate overview, ATS compatibility, and readiness assessment.
        </p>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ATS MATCH SCORE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ATS Match Score
            </span>
            <ScanLine className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">78%</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ↗ +5%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-[78%]" />
          </div>
        </div>

        {/* MISSING SKILLS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Missing Skills
            </span>
            <TriangleAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900">4</span>
            <span className="text-xs text-slate-400 font-medium">identified</span>
          </div>
          <p className="text-xs text-slate-500">Action required to improve match.</p>
        </div>

        {/* PRACTICE SESSIONS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Practice Sessions
            </span>
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900">3</span>
            <span className="text-xs text-slate-400 font-medium">completed</span>
          </div>
          <p className="text-xs text-slate-500">Last session 2 days ago.</p>
        </div>

        {/* READINESS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Readiness
            </span>
            <BadgeCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-extrabold text-emerald-600">Ready</span>
          </div>
          <p className="text-xs text-slate-500">Approved for technical screening.</p>
        </div>

      </div>

      {/* 3. LOWER SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: RESUME ANALYSIS & GAP ANALYSIS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-base font-bold text-slate-800">
              <FileText className="w-5 h-5 text-slate-400" />
              <span>Resume Analysis</span>
            </div>
            <button
              onClick={() => navigate('/corrections')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View Full Analysis
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* EXTRACTED SKILLS */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Extracted Skills (Matched)
              </div>
              <div className="flex flex-wrap gap-2">
                {candidateSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold"
                  >
                    <CircleCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* GAP ANALYSIS */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Skill Gap Analysis
              </div>
              
              <div className="space-y-3">
                {/* DANGER GAP */}
                <div className="p-3.5 bg-red-50/60 border border-red-200/80 rounded-xl flex items-start gap-3">
                  <CircleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 mb-0.5">
                      GraphQL
                    </strong>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Frequently requested for Senior Frontend roles. Consider adding projects with GraphQL to your resume.
                    </p>
                  </div>
                </div>

                {/* INFO GAP */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 mb-0.5">
                      Docker
                    </strong>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mentioned in previous roles but not explicitly listed in the skills summary section.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: AI INTERVIEW QUICK START & JOB RECOMMENDATIONS */}
        <div className="space-y-6">
          
          {/* QUICK START AI INTERVIEW BANNER */}
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md overflow-hidden">
            <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <Mic className="w-5 h-5 text-white" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">
              Quick Start AI Interview
            </h2>
            <p className="text-xs text-blue-100 leading-relaxed mb-5">
              Test your skills against personalized technical questions based on your identified resume gaps.
            </p>

            <button
              onClick={() => navigate('/interview')}
              className="w-full py-2.5 bg-white text-blue-600 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>Start Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TOP JOB RECOMMENDATIONS */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Clock3 className="w-4 h-4 text-slate-400" />
                <span>Top Job Recommendations</span>
              </div>
              <button
                onClick={() => navigate('/jobs')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recommendedJobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                      {job.match}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">{job.company}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}