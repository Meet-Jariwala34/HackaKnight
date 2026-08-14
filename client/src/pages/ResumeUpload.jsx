import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileUp,
  CloudUpload,
  Info,
  FileText,
  X,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Check,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function ResumeUpload({ user, onUploadComplete }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Component State
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB Limit
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
  ];

  // Validate and assign file
  const handleSelectedFile = (selectedFile) => {
    setErrorMsg('');

    if (!selectedFile) return;

    // 1. File Size Validation
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMsg('File size exceeds the 5 MB limit. Please select a smaller file.');
      return;
    }

    // 2. File Format Validation
    if (!ALLOWED_TYPES.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|docx|png|jpg|jpeg|webp)$/i)) {
      setErrorMsg('Unsupported format. Please upload a PDF, DOCX, PNG, or JPG file.');
      return;
    }

    setFile(selectedFile);

    // Create thumbnail if image
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Format bytes helper
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Submit and Upload to Backend
  const handleUploadSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('candidateName', user?.name || 'Meet Jariwala');
    formData.append('candidateEmail', user?.email || 'candidate@example.com');
    formData.append('targetJobId', '1');

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      if (onUploadComplete) {
        onUploadComplete(response.data);
      }

      // Navigate to corrections page to show results
      navigate('/corrections');
    } catch (err) {
      console.error('Upload Error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to process resume with AI. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 1. PAGE HEADING */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Upload Candidate Resume
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload a resume document or image for AI parsing, skill gap analysis, and ATS matching.
        </p>
      </div>

      {/* 2. MAIN GRID (UPLOAD CARD + GUIDELINES CARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT CONTAINER: UPLOAD BOX */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <FileUp className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">Resume Upload Zone</h2>
          </div>

          <div className="p-6">
            
            {/* HIDDEN FILE INPUT */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => handleSelectedFile(e.target.files[0])}
            />

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragOver
                  ? 'border-blue-600 bg-blue-50/40'
                  : 'border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50'
              } ${file ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {!file ? (
                /* DEFAULT EMPTY DROPZONE VIEW */
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-inner">
                    <CloudUpload className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Upload Resume Document</h3>
                  <p className="text-xs text-slate-500 mb-5 max-w-sm">
                    Drag & drop your resume file or image here, or{' '}
                    <span className="text-blue-600 font-semibold underline">browse files</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[11px] font-medium">
                      <Info className="w-3.5 h-3.5 text-blue-600" /> Max Size: <strong>5 MB</strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[11px] font-medium">
                      Formats: <strong>PDF, DOCX, PNG, JPG</strong>
                    </span>
                  </div>
                </div>
              ) : (
                /* FILE SELECTED PREVIEW VIEW */
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-left shadow-sm">
                  <div className="flex items-center gap-3">
                    {previewUrl ? (
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(file.size)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      disabled={isUploading}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* PROGRESS BAR */}
                  {isUploading && (
                    <div className="mt-4 space-y-1.5">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Extracting text & computing ATS score...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ERROR ALERT BANNER */}
            {errorMsg && (
              <div className="mt-4 p-3.5 bg-red-50 border border-red-200/80 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              onClick={handleUploadSubmit}
              disabled={!file || isUploading}
              className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Resume with AI Engine...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process Resume with AI</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* RIGHT CONTAINER: UPLOAD GUIDELINES */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Upload Guidelines</span>
          </div>

          <ul className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Ensure document text is selectable and clearly formatted for optimal NLP parsing.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Strict file size restriction of <strong>5 MB</strong> maximum.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Supported file formats: PDF, DOCX, PNG, JPG, and WEBP.</span>
            </li>
          </ul>

          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Uploaded files are parsed using PyMuPDF and evaluated privately in RAM without unencrypted disk storage.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}