const API_BASE = process.env.REACT_APP_API_URL || '';

export async function generateFromText(resumeText, template) {
  const res = await fetch(`${API_BASE}/api/generate-from-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText, template }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Generation failed. Please try again.');
  }
  return res.json();
}

export async function generateFromPDF(file, template) {
  const form = new FormData();
  form.append('file', file);
  form.append('template', template);
  const res = await fetch(`${API_BASE}/api/generate-from-pdf`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'PDF parsing failed. Try pasting your resume text instead.');
  }
  return res.json();
}

export async function downloadZip(resumeText, template) {
  const res = await fetch(`${API_BASE}/api/download-zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText, template }),
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-portfolio.zip';
  a.click();
  URL.revokeObjectURL(url);
}
