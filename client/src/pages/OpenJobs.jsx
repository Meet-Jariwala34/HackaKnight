import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  Search,
  Plus,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function OpenJobs({ user }) {
  const navigate = useNavigate();

  // State Management
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch Jobs from PostgreSQL Backend
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/jobs');
        if (response.data && response.data.length > 0) {
          // Normalize schema format from DB
          const mappedJobs = response.data.map((j) => ({
            id: j.job_id || j.id,
            title: j.company_name ? `${j.rols || 'Software Engineer'}` : j.title,
            company: j.company_name || j.company || 'TechCorp',
            department: j.rols || 'Engineering',
            type: j.eligibility || 'Full-time',
            location: j.location || 'Remote',
            skills: Array.isArray(j.required_skills)
              ? j.required_skills
              : (typeof j.required_skills === 'string' ? JSON.parse(j.required_skills) : ['React', 'Node.js', 'PostgreSQL']),
            matchScore: 85 + (j.job_id % 12 || 5), // Dynamic match demo computation
            candidateCount: (j.no_of_vacancy || 2) * 6,
          }));
          setJobs(mappedJobs);
        } else {
          // Clean fallback mock jobs
          setJobs(defaultMockJobs);
        }
      } catch (err) {
        console.warn('Backend job fetch failed, using pre-seeded roles:', err.message);
        setJobs(defaultMockJobs);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Filter Logic (Search by Title/Company/Skills & Department)
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'All' || job.department.toLowerCase().includes(selectedDept.toLowerCase());

    return matchesSearch && matchesDept;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const indexOfLastJob = currentPage * itemsPerPage;
  const indexOfFirstJob = indexOfLastJob - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP BAR SEARCH & HEADING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Open Job Opportunities
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and match active candidate pipelines against open requisitions.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => alert('New Job creation modal can be hooked here!')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Role</span>
        </button>
      </div>

      {/* 2. MAIN JOB TABLE CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* FILTER BAR & SEARCH */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by job title, skill, or company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl outline-none cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <option value="All">All Departments</option>
              <option value="Frontend">Frontend Engineering</option>
              <option value="Backend">Backend Engineering</option>
              <option value="Fullstack">Full Stack</option>
              <option value="Design">UI/UX Design</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Reset
            </button>
          </div>

        </div>

        {/* 3. TABLE BODY */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading open roles from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Job Title & Details</th>
                  <th className="py-3.5 px-6">Required Skills</th>
                  <th className="py-3.5 px-6 text-center">Pool Match Score</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {currentJobs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 text-xs">
                      No matching job opportunities found.
                    </td>
                  </tr>
                ) : (
                  currentJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Job Title & Details */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {job.company} • {job.type} • {job.location}
                        </div>
                      </td>

                      {/* Required Skills Badges */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {job.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium border border-slate-200/60"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Match Score */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              job.matchScore >= 80
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <TrendingUp className="w-3 h-3" />
                            {job.matchScore}%
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            {job.candidateCount} Candidates
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate('/interview')}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Interview</span>
                          </button>

                          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. TABLE FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{indexOfFirstJob + 1}</strong> to{' '}
            <strong className="text-slate-800">
              {Math.min(indexOfLastJob, filteredJobs.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredJobs.length}</strong> active roles
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

// Fallback Default Mock Roles
const defaultMockJobs = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    department: 'Frontend Engineering',
    type: 'Full-time',
    location: 'Remote',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    matchScore: 92,
    candidateCount: 24,
  },
  {
    id: 2,
    title: 'Backend Architecture Lead',
    company: 'Innovate Solutions',
    department: 'Backend Engineering',
    type: 'Full-time',
    location: 'San Francisco, CA',
    skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Redis'],
    matchScore: 85,
    candidateCount: 12,
  },
  {
    id: 3,
    title: 'Product Designer (UI/UX)',
    company: 'Digital Labs',
    department: 'Design',
    type: 'Contract',
    location: 'Hybrid',
    skills: ['Figma', 'Prototyping', 'Design Systems', 'User Research'],
    matchScore: 68,
    candidateCount: 8,
  },
  {
    id: 4,
    title: 'Full Stack AI Engineer',
    company: 'HackaKnight AI',
    department: 'Fullstack',
    type: 'Full-time',
    location: 'Remote',
    skills: ['React', 'FastAPI', 'Gemini API', 'PostgreSQL'],
    matchScore: 94,
    candidateCount: 19,
  },
];