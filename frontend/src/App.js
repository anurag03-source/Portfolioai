import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateFromText, generateFromPDF, downloadZip } from './utils/api';

const TEMPLATES = [
  { id: 'noir', name: 'Noir Pro', desc: 'Dark & bold', emoji: '🌑', accent: '#6366f1' },
  { id: 'minimal', name: 'Arctic', desc: 'Clean & light', emoji: '❄️', accent: '#0ea5e9' },
  { id: 'emerald', name: 'Emerald', desc: 'Startup green', emoji: '🌿', accent: '#10b981' },
  { id: 'solar', name: 'Solar', desc: 'Warm creative', emoji: '☀️', accent: '#f59e0b' },
];

const LOADING_STEPS = [
  { icon: '🔍', text: 'Reading your resume...' },
  { icon: '🤖', text: 'AI analyzing your experience...' },
  { icon: '✨', text: 'Rewriting projects professionally...' },
  { icon: '🎨', text: 'Applying your template...' },
  { icon: '🚀', text: 'Building your portfolio...' },
  { icon: '🔥', text: 'Almost ready...' },
];

const S = {
  app: { minHeight: '100vh', background: '#0a0a0f', color: '#e8e8f0', fontFamily: "'Inter', system-ui, sans-serif" },
  header: { borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 },
  logoText: { fontWeight: 800, fontSize: 17, color: '#e8e8f0', letterSpacing: '-0.3px' },
  badge: (color = '#818cf8', bg = 'rgba(99,102,241,0.15)', border = 'rgba(99,102,241,0.25)') => ({
    fontSize: 11, padding: '3px 9px', background: bg, color, borderRadius: 999, border: `1px solid ${border}`, fontWeight: 600
  }),
  container: { maxWidth: 740, margin: '0 auto', padding: '0 24px' },
  card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 },
  input: { width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#e8e8f0', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6, resize: 'vertical', outline: 'none' },
  btnPrimary: { padding: '14px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.2s', letterSpacing: '-0.2px' },
  btnOutline: { padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' },
};

function Header({ onReset, showReset }) {
  return (
    <div style={S.header}>
      <div style={S.logo}>
        <div style={S.logoIcon}>⚡</div>
        <span style={S.logoText}>PortfolioAI</span>
        <span style={S.badge()}>BETA</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#475569' }}>Resume → Portfolio in 30s</span>
        {showReset && (
          <button onClick={onReset} style={S.btnOutline}>↩ New Portfolio</button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, selected, onSelect }) {
  const isSelected = selected === template.id;
  return (
    <div
      onClick={() => onSelect(template.id)}
      style={{
        padding: '16px 12px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
        border: `1.5px solid ${isSelected ? template.accent : 'rgba(255,255,255,0.07)'}`,
        background: isSelected ? `${template.accent}15` : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 8 }}>{template.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? template.accent : '#94a3b8', marginBottom: 3 }}>{template.name}</div>
      <div style={{ fontSize: 11, color: '#475569' }}>{template.desc}</div>
    </div>
  );
}

function UploadPage({ onGenerate }) {
  const [template, setTemplate] = useState('noir');
  const [resumeText, setResumeText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => setLoadingStep(s => (s + 1) % LOADING_STEPS.length), 1800);
    return () => clearInterval(iv);
  }, [isLoading]);

  const handleFile = useCallback(async (file) => {
    setError('');
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB).'); return; }
    if (file.type === 'text/plain') {
      const text = await file.text();
      setResumeText(text);
      setUploadedFile(null);
      return;
    }
    if (file.type === 'application/pdf') {
      setUploadedFile(file);
      return;
    }
    setError('Please upload a PDF or TXT file.');
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!resumeText.trim() && !uploadedFile) {
      setError('Please paste your resume text or upload a PDF.');
      return;
    }
    setIsLoading(true);
    try {
      let result;
      if (uploadedFile) {
        result = await generateFromPDF(uploadedFile, template);
      } else {
        result = await generateFromText(resumeText, template);
      }
      onGenerate(result, resumeText || '', template);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    const step = LOADING_STEPS[loadingStep];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 28, padding: 24 }}>
        <div style={{ width: 68, height: 68, border: '3px solid rgba(99,102,241,0.15)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#e8e8f0', marginBottom: 8, letterSpacing: '-0.3px' }}>{step.text}</p>
          <p style={{ fontSize: 14, color: '#475569' }}>AI is crafting your perfect portfolio...</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', opacity: loadingStep % 3 === i ? 1 : 0.2, transition: 'opacity 0.3s' }} />
          ))}
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ ...S.container, paddingTop: 52, paddingBottom: 64 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ display: 'inline-block', padding: '7px 18px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid rgba(99,102,241,0.22)', marginBottom: 22 }}>
          🎓 Built for Students & Freshers Placing Out
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,58px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 18, background: 'linear-gradient(135deg, #e8e8f0 0%, #818cf8 50%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-2px' }}>
          Turn Your Resume Into<br />a Portfolio Website
        </h1>
        <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
          No coding. No React. No design skills.<br />
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>AI rewrites your projects to sound 10× better.</span>
        </p>
      </div>

      {/* Template Picker */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Choose Template</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {TEMPLATES.map(t => <TemplateCard key={t.id} template={t} selected={template} onSelect={setTemplate} />)}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => !uploadedFile && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${isDragging ? '#6366f1' : uploadedFile ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16, padding: '40px 24px', textAlign: 'center',
          cursor: uploadedFile ? 'default' : 'pointer', marginBottom: 16,
          background: isDragging ? 'rgba(99,102,241,0.05)' : uploadedFile ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s',
        }}
      >
        {uploadedFile ? (
          <div>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#6ee7b7', marginBottom: 6 }}>{uploadedFile.name}</p>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>{(uploadedFile.size / 1024).toFixed(0)} KB · PDF ready to parse</p>
            <button onClick={e => { e.stopPropagation(); setUploadedFile(null); }} style={{ ...S.btnOutline, fontSize: 12, padding: '6px 14px' }}>Remove</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 38, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0', marginBottom: 6 }}>Drop your resume PDF here</p>
            <p style={{ fontSize: 13, color: '#475569' }}>PDF or TXT · Max 10MB · Or click to browse</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>OR PASTE RESUME TEXT</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Text area */}
      <textarea
        value={resumeText}
        onChange={e => setResumeText(e.target.value)}
        placeholder={"Paste your resume, LinkedIn bio, or just describe yourself...\n\nExample:\nName: Anurag Sharma\nCSE Student at VIT Vellore\nSkills: React, Python, Node.js, MySQL\nProjects: Built an attendance system using face recognition (OpenCV, Flask), Made an e-commerce site with 500+ users\nCGPA: 8.7 | Email: anurag@email.com"}
        style={{ ...S.input, height: 160, marginBottom: 16 }}
      />

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* CTA */}
      <button onClick={handleSubmit} style={S.btnPrimary}>
        ⚡ Generate My Portfolio →
      </button>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#1e293b', marginTop: 12 }}>Free · No signup required · Ready in 30 seconds</p>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 40 }}>
        {[
          ['🎯', 'AI-Enhanced', 'Projects rewritten to sound professional and impressive'],
          ['⚡', '30 Seconds', 'From resume text to live portfolio in under a minute'],
          ['🎨', '4 Templates', 'Recruiter-tested designs that actually get noticed'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ padding: 18, ...S.card, textAlign: 'center', borderRadius: 14 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultPage({ result, resumeText, initialTemplate, onReset }) {
  const [template, setTemplate] = useState(initialTemplate);
  const [html, setHtml] = useState(result.html);
  const [data] = useState(result.data);
  const [activeTab, setActiveTab] = useState('preview');
  const [isRegen, setIsRegen] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef();

  useEffect(() => {
    if (activeTab !== 'preview' || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
  }, [html, activeTab]);

  const switchTemplate = async (tid) => {
    if (tid === template || isRegen) return;
    setTemplate(tid);
    setIsRegen(true);
    try {
      const r = await generateFromText(resumeText, tid);
      setHtml(r.html);
    } catch (e) { }
    setIsRegen(false);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(data.name || 'portfolio').toLowerCase().replace(/\s/g, '-')}-portfolio.html`;
    a.click();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 61px)' }}>
      {/* Toolbar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.01)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3, gap: 2 }}>
          {[['preview', '👁 Preview'], ['code', '💾 HTML']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: activeTab === id ? 'rgba(99,102,241,0.35)' : 'transparent', color: activeTab === id ? '#e8e8f0' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === id ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Template switcher */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => switchTemplate(t.id)} disabled={isRegen} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.07)'}`, background: template === t.id ? `${t.accent}18` : 'transparent', color: template === t.id ? t.accent : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: isRegen ? 0.5 : 1 }}>
              {t.emoji} {t.name}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {activeTab === 'code' && (
            <button onClick={copyCode} style={{ ...S.btnOutline, fontSize: 12 }}>
              {copied ? '✓ Copied!' : 'Copy HTML'}
            </button>
          )}
          <button onClick={handleDownload} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            ⬇ Download HTML
          </button>
        </div>
      </div>

      {/* Success bar */}
      <div style={{ padding: '9px 20px', background: 'rgba(16,185,129,0.07)', borderBottom: '1px solid rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>✅</span>
        <span style={{ fontSize: 13, color: '#6ee7b7' }}>
          <strong>Portfolio ready for {data.name}!</strong> — Download HTML → drag to{' '}
          <a href="https://netlify.com/drop" target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>netlify.com/drop</a>
          {' '}for free instant hosting.
        </span>
        {isRegen && <span style={{ fontSize: 12, color: '#818cf8', marginLeft: 'auto' }}>⚡ Switching template...</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'preview' ? (
          <iframe ref={iframeRef} title="Portfolio Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : (
          <div style={{ position: 'relative', height: '100%' }}>
            <pre style={{ padding: 24, background: '#0d0d1a', color: '#94a3b8', fontSize: 12, lineHeight: 1.65, height: '100%', overflow: 'auto', fontFamily: "'Fira Code', 'Consolas', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {html}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState('upload');
  const [result, setResult] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [template, setTemplate] = useState('noir');

  const handleGenerate = (res, text, tmpl) => {
    setResult(res);
    setResumeText(text);
    setTemplate(tmpl);
    setStep('result');
  };

  const handleReset = () => {
    setStep('upload');
    setResult(null);
    setResumeText('');
  };

  return (
    <div style={S.app}>
      <Header onReset={handleReset} showReset={step === 'result'} />
      {step === 'upload' && <UploadPage onGenerate={handleGenerate} />}
      {step === 'result' && result && (
        <ResultPage result={result} resumeText={resumeText} initialTemplate={template} onReset={handleReset} />
      )}
    </div>
  );
}
