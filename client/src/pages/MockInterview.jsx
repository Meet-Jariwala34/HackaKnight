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
  Volume2,
  Radio,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import socket from '../services/socket';

export default function MockInterview({ user }) {
  const navigate = useNavigate();

  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [questionText, setQuestionText] = useState(
    'Welcome! To start off, could you explain how you handle state management and asynchronous data fetching in React applications?'
  );
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);

  // Live Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState('');

  const isListeningRef = useRef(false);
  const recognitionRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');

  // -------------------------------------------------------------
  // Socket.io Response Listener
  // -------------------------------------------------------------
  useEffect(() => {
    socket.on('ai_reply', (data) => {
      setIsEvaluating(false);
      setLastFeedback(data);

      if (data.nextQuestion) {
        setQuestionText(data.nextQuestion);
        setCurrentQuestionId((prev) => prev + 1);
      }

      if (data.audioUrl) {
        setIsAiSpeaking(true);
        const audio = new Audio(data.audioUrl);
        audio.play().catch((e) => console.log('Audio autoplay blocked:', e));
        audio.onended = () => setIsAiSpeaking(false);
      }
    });

    socket.on('ai_error', (err) => {
      console.error('AI Socket Error:', err);
      setIsEvaluating(false);
      alert('Error evaluating answer. Please try again.');
    });

    return () => {
      socket.off('ai_reply');
      socket.off('ai_error');
    };
  }, []);

  // -------------------------------------------------------------
  // Speech Recognition Controller
  // -------------------------------------------------------------
  const startListening = () => {
  setSpeechError('');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setSpeechError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  isListeningRef.current = true;
  setIsListening(true);

  const initRecognition = () => {
    if (!isListeningRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      // Setting continuous to false forces Chrome to emit words immediately on phrase breaks
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // or 'en-US'

      recognition.onresult = (event) => {
        let currentPhrase = '';
        for (let i = 0; i < event.results.length; i++) {
          currentPhrase += event.results[i][0].transcript;
        }

        // Live text update directly into the textarea
        if (event.results[0].isFinal) {
          setTranscript((prev) => (prev ? prev + ' ' + currentPhrase : currentPhrase).trim());
          setInterimText('');
        } else {
          setInterimText(currentPhrase);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech engine notice:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Enable it in browser settings.');
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart to keep listening seamlessly across pauses
        if (isListeningRef.current) {
          initRecognition();
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Recognition error:', err);
    }
  };

  initRecognition();
};

const stopListening = () => {
  isListeningRef.current = false;
  setIsListening(false);
  if (recognitionRef.current) {
    recognitionRef.current.stop();
  }
  setInterimText('');
};

  const submitAnswer = () => {
    const fullAnswer = (transcript + (interimText ? ' ' + interimText : '')).trim();

    if (!fullAnswer) {
      alert('Please speak or type your answer before submitting.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsEvaluating(true);

    socket.emit('submit_answer', {
      sessionId: 1,
      userAnswer: fullAnswer,
      currentQuestionId: currentQuestionId,
      questionText: questionText,
    });

    setTranscript('');
    setInterimText('');
    accumulatedTranscriptRef.current = '';
  };

  // =============================================================
  // VIEW 1: ACTIVE LIVE INTERVIEW SCREEN
  // =============================================================
  if (sessionActive) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Live AI Technical Interview
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
              Question {currentQuestionId}
            </h1>
          </div>

          <button
            onClick={() => {
              if (isListening) stopListening();
              setSessionActive(false);
            }}
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
                AI Interviewer (Engineering Manager)
              </span>
            </div>
            {isAiSpeaking && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <Volume2 className="w-4 h-4 animate-bounce" /> Speaking Question...
              </span>
            )}
          </div>

          <p className="text-lg text-slate-100 font-medium leading-relaxed">
            "{questionText}"
          </p>
        </div>

        {/* Previous Answer Evaluation Scorecard */}
        {lastFeedback && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2 animate-in fade-in">
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

        {/* Candidate Voice Input & Real-Time Spoken Text Box */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Candidate Spoken Answer
              </span>
              {isListening && (
                <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-red-600" />
                  Live Recording & Transcribing
                </span>
              )}
            </div>

            {/* Mic Controls */}
            <div>
              {!isListening ? (
                <button
                  type="button"
                  onClick={startListening}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Speaking</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Square className="w-3.5 h-3.5 text-red-400" />
                  <span>Pause Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Diagnostic Error Banner */}
          {speechError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Real-Time Live Streaming Subtitle Bubble */}
          {isListening && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-blue-600 animate-bounce flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-700">Live Captions: </span>
                {transcript} <span className="text-blue-600 italic font-semibold">{interimText}</span>
                {!transcript && !interimText && (
                  <span className="text-slate-400 italic">Listening... speak into your microphone.</span>
                )}
              </div>
            </div>
          )}

          {/* Editable Text Area */}
          <textarea
            value={transcript + (interimText ? ' ' + interimText : '')}
            onChange={(e) => {
              setTranscript(e.target.value);
              accumulatedTranscriptRef.current = e.target.value;
            }}
            placeholder={
              isListening
                ? 'Listening... words will appear here automatically as you talk.'
                : 'Click "Start Speaking" or type your response manually here...'
            }
            rows={5}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all resize-none"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                setInterimText('');
                accumulatedTranscriptRef.current = '';
              }}
              disabled={!transcript && !interimText}
              className="px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={submitAnswer}
              disabled={(!transcript.trim() && !interimText.trim()) || isEvaluating}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating answer & formulating next question...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    );
  }

  // =============================================================
  // VIEW 2: SETUP SCREEN
  // =============================================================
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
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

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Bot className="w-4 h-4 text-blue-600" />
              <span>AI Interviewer Persona</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Configured as a Senior Engineering Manager. Tone is professional, analytical, and probing.
            </p>
          </div>

          <button
            onClick={() => setSessionActive(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Begin Interactive Interview</span>
          </button>
        </div>

        <div className="space-y-6">
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
            </div>

            <button
              onClick={() => navigate('/questions')}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Practice Question Bank</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              System Check
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Microphone & STT</span>
                </div>
                <span className="text-emerald-600 font-medium">Ready</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>WebSocket Connection</span>
                </div>
                <span className="text-emerald-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}