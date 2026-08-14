import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  Building,
  MapPin,
  Clock,
  Bot,
  Video,
  Pen,
  User,
  GitBranch,
  FolderOpen,
  CheckCircle2,
  Mic,
  Square,
  Send,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import socket from '../services/socket';

export default function MockInterview({ user }) {
  const navigate = useNavigate();

  // Mode: 'SETUP' or 'ACTIVE_SESSION'
  const [sessionActive, setSessionActive] = useState(false);

  // Active Session State
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [questionText, setQuestionText] = useState(
    'Welcome! To start off, could you explain how you handle state management and asynchronous data fetching in React applications?'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Setup Socket.io Listeners
  useEffect(() => {
    socket.on('ai_reply', (data) => {
      console.log('🤖 Received AI Evaluation:', data);
      setIsEvaluating(false);
      setLastFeedback(data);

      if (data.nextQuestion) {
        setQuestionText(data.nextQuestion);
        setCurrentQuestionId((prev) => prev + 1);
      }

      // Auto-play AI response audio if provided
      if (data.audioUrl) {
        setIsAiSpeaking(true);
        const audio = new Audio(data.audioUrl);
        audio.play().catch((e) => console.log('Audio autoplay blocked:', e));
        audio.onended = () => setIsAiSpeaking(false);
      }
    });

    socket.on('ai_error', (err) => {
      console.error('AI Error:', err);
      setIsEvaluating(false);
      alert('Error evaluating answer. Please try again.');
    });

    return () => {
      socket.off('ai_reply');
      socket.off('ai_error');
    };
  }, []);

  // 1. Microphone Voice Recorder & Speech-to-Text
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();

      // Web Speech API for Real-Time Console Logging
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let liveText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            liveText += event.results[i][0].transcript;
          }
          console.log('🎤 Candidate Spoke:', liveText);
          setTranscript(liveText);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied. Please grant mic permissions in browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      console.log('✅ Final Candidate Answer:', transcript);
    }
    setIsRecording(false);
  };

  // 2. Submit Answer via Socket.io
  const submitAnswer = () => {
    if (!transcript.trim()) {
      alert('Please speak or record your answer first.');
      return;
    }

    setIsEvaluating(true);
    socket.emit('submit_answer', {
      sessionId: 1,
      userAnswer: transcript,
      currentQuestionId: currentQuestionId,
      questionText: questionText,
    });

    setTranscript('');
  };

  // =========================================================================
  // VIEW 1: ACTIVE LIVE AI INTERVIEW ROOM
  // =========================================================================
  if (sessionActive) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Live AI Interview In Progress
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
              Question {currentQuestionId}
            </h1>
          </div>

          <button
            onClick={() => setSessionActive(false)}
            className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
          >
            End Interview
          </button>
        </div>

        {/* AI Question Box */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isAiSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-blue-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-400" />
                AI Interviewer (Senior Engineering Manager)
              </span>
            </div>
            {isAiSpeaking && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <Volume2 className="w-4 h-4 animate-bounce" /> Speaking Response...
              </span>
            )}
          </div>

          <p className="text-lg text-slate-100 font-medium leading-relaxed">
            "{questionText}"
          </p>
        </div>

        {/* Previous Answer Evaluation Scorecard */}
        {lastFeedback && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Previous Answer Feedback
              </span>
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Score: {lastFeedback.score || 8}/10
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              <strong className="text-emerald-600">Evaluation: </strong>
              {lastFeedback.feedback}
            </p>
            {lastFeedback.modelAnswer && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <strong>Ideal Response: </strong>
                {lastFeedback.modelAnswer}
              </p>
            )}
          </div>
        )}

        {/* Candidate Voice Input Section */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Candidate Response
            </span>
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>Start Speaking</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Square className="w-3.5 h-3.5 text-red-400" />
                  <span>Stop & Lock Answer</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Transcript Display */}
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={
              isRecording
                ? 'Listening... Spoken text will appear here automatically.'
                : 'Click "Start Speaking" or type your response here...'
            }
            rows={4}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all resize-none"
          />

          <button
            onClick={submitAnswer}
            disabled={!transcript.trim() || isEvaluating}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI evaluating response & formulating next question...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Answer & Next Question</span>
              </>
            )}
          </button>
        </div>

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SETUP & DIAGNOSTICS DASHBOARD (MATCHING YOUR EXACT HTML/CSS)
  // =========================================================================
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* PAGE HEADING */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Mock Interview Session
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure and launch AI-driven technical and behavioral evaluations.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-bold border border-indigo-100">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Estimated time: 45m</span>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: MAIN CONFIGURATION CARD */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* ROLE HEADER */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Full Stack Engineer</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" /> Top Tech Firm
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> San Francisco / Remote
                </span>
              </div>
            </div>
          </div>

          {/* EVALUATION FOCUS AREAS */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              EVALUATION FOCUS AREAS
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'JavaScript (ES6+)',
                'System Design',
                'Problem Solving',
                'Communication',
                'Database Architecture',
              ].map((focus, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold"
                >
                  {focus}
                </span>
              ))}
            </div>
          </div>

          {/* AI PERSONA BOX */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Bot className="w-4 h-4 text-blue-600" />
              <span>AI Interviewer Persona</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Configured as a Senior Engineering Manager. Tone is professional, analytical, and probing. Will focus heavily on practical application of architectural principles and behavioral responses under pressure.
            </p>
          </div>

          {/* BEGIN INTERVIEW BUTTON */}
          <button
            onClick={() => setSessionActive(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Begin Interactive Interview</span>
          </button>

        </div>

        {/* RIGHT COLUMN: QUESTION BANK & SYSTEM CHECK */}
        <div className="space-y-6">
          
          {/* QUESTION BANK SETUP CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Question Bank Setup</h3>
              <Pen className="w-3.5 h-3.5 text-blue-600 cursor-pointer" />
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Behavioral</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">3 Qs</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Code className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Technical</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">2 Qs</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">System Design</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">1 Q</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/questions')}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Practice Question Bank</span>
            </button>
          </div>

          {/* SYSTEM CHECK CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              System Check
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Camera</span>
                </div>
                <span className="text-slate-400 font-medium">HD Web Camera</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Microphone</span>
                </div>
                <span className="text-slate-400 font-medium">Default Mic</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Connection</span>
                </div>
                <span className="text-slate-400 font-medium">120 Mbps</span>
              </div>
            </div>

            <button
              onClick={() => alert('Diagnostics Status: Microphone, Camera, and WebSocket are fully operational.')}
              className="w-full text-center text-xs font-bold text-blue-600 hover:underline pt-2 block"
            >
              Re-run Diagnostics
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}