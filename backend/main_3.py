import os
import io
import json
import base64
import tempfile
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pdfplumber
from pypdf import PdfReader
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

app = FastAPI(title="PortfolioAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMPLATES = {
    "noir":    {"bg": "#0f0f1a", "accent": "#6366f1", "text": "#e8e8f0", "muted": "#94a3b8", "dark": True},
    "minimal": {"bg": "#f8fafc", "accent": "#0ea5e9", "text": "#1e293b", "muted": "#64748b", "dark": False},
    "emerald": {"bg": "#0a1628", "accent": "#10b981", "text": "#e8e8f0", "muted": "#94a3b8", "dark": True},
    "solar":   {"bg": "#1a1508", "accent": "#f59e0b", "text": "#e8e8f0", "muted": "#94a3b8", "dark": True},
}


class GenerateRequest(BaseModel):
    resume_text: str
    template: str = "noir"
    github_username: str = ""


def call_ai(prompt: str) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def extract_pdf_text(file_bytes: bytes) -> str:
    # Method 1: pdfplumber
    try:
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text(x_tolerance=3, y_tolerance=3)
                if extracted:
                    text += extracted + "\n"
        if len(text.strip()) > 100:
            return text.strip()
    except Exception:
        pass

    # Method 2: pypdf
    try:
        text = ""
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if len(text.strip()) > 100:
            return text.strip()
    except Exception:
        pass

    raise ValueError(
        "Could not extract text from this PDF. Please paste your resume text directly into the text box instead."
    )


def parse_resume_with_ai(resume_text: str) -> dict:
    prompt = f"""You are an expert resume parser and professional portfolio writer.

Extract data from the resume below and return ONLY valid JSON — no markdown, no explanation, no code fences.

Resume:
{resume_text}

Return exactly this JSON structure:
{{
  "name": "Full Name",
  "title": "Professional Title (e.g. Full Stack Developer | Computer Science Student)",
  "bio": "Compelling 2-3 sentence first-person bio. Mention tech stack, passion, and what you build. Make it recruiter-friendly and confident.",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "github": "github URL or empty string",
  "linkedin": "linkedin URL or empty string",
  "location": "City, State or empty string",
  "skills": ["skill1", "skill2"],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Professional 2-3 sentence description. Start with an action verb. Mention tech stack, what problem it solves, and scale/impact if any. Make it impressive.",
      "tech": "Python, React, etc",
      "link": "project URL or empty string",
      "github": "github repo URL or empty string"
    }}
  ],
  "experience": [
    {{
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Month Year - Month Year",
      "description": "2-3 sentences of achievements. Use action verbs. Quantify impact.",
      "location": "City or Remote"
    }}
  ],
  "education": [
    {{
      "degree": "B.Tech in Computer Science",
      "institution": "University Name",
      "year": "2024",
      "cgpa": "8.5 or empty string"
    }}
  ],
  "achievements": ["Achievement 1", "Achievement 2"],
  "certifications": ["Cert 1", "Cert 2"]
}}

IMPORTANT RULES:
- Rewrite ALL project descriptions professionally with action verbs and impact
- If CGPA or achievements are missing, use empty strings/arrays
- Bio must sound human and confident, not robotic
- Infer title from skills/experience if not explicitly stated
- Return ONLY the JSON object, absolutely nothing else, no extra text"""

    raw = call_ai(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def generate_html(data: dict, template: str = "noir") -> str:
    t = TEMPLATES.get(template, TEMPLATES["noir"])
    bg = t["bg"]
    accent = t["accent"]
    text_color = t["text"]
    muted = t["muted"]
    is_dark = t["dark"]
    card_bg = "rgba(255,255,255,0.04)" if is_dark else "rgba(0,0,0,0.03)"
    border = "rgba(255,255,255,0.08)" if is_dark else "rgba(0,0,0,0.08)"
    nav_bg = f"{bg}f0"

    skills_html = "".join([
        f'<span style="display:inline-block;padding:6px 16px;border-radius:999px;background:{accent}22;color:{accent};border:1px solid {accent}44;font-size:13px;font-weight:500;margin:4px 4px;">{s}</span>'
        for s in (data.get("skills") or [])
    ])

    projects_html = "".join([
        f'''<div style="background:{card_bg};border:1px solid {border};border-radius:16px;padding:28px;margin-bottom:20px;transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;">
    <h3 style="font-size:20px;font-weight:700;color:{text_color};margin:0;">{p.get("name","Project")}</h3>
    {f'<span style="font-size:12px;color:{muted};background:{card_bg};padding:5px 12px;border-radius:8px;border:1px solid {border};white-space:nowrap;">{p.get("tech","")}</span>' if p.get("tech") else ""}
  </div>
  <p style="color:{muted};line-height:1.8;font-size:15px;margin:0 0 16px;">{p.get("description","")}</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    {f'<a href="{p.get("link")}" target="_blank" style="color:{accent};font-size:13px;font-weight:600;text-decoration:none;padding:6px 14px;border:1px solid {accent}44;border-radius:8px;">Live Demo →</a>' if p.get("link") else ""}
    {f'<a href="{p.get("github")}" target="_blank" style="color:{muted};font-size:13px;text-decoration:none;padding:6px 14px;border:1px solid {border};border-radius:8px;">GitHub</a>' if p.get("github") else ""}
  </div>
</div>'''
        for p in (data.get("projects") or [])
    ])

    experience_html = "".join([
        f'''<div style="border-left:3px solid {accent};padding-left:24px;margin-bottom:32px;position:relative;">
  <div style="position:absolute;left:-7px;top:4px;width:11px;height:11px;border-radius:50%;background:{accent};"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
    <div>
      <h3 style="font-size:18px;font-weight:700;color:{text_color};margin:0 0 4px;">{e.get("role","")}</h3>
      <p style="color:{accent};font-size:15px;font-weight:600;margin:0;">{e.get("company","")}{(f" · {e.get('location')}" if e.get("location") else "")}</p>
    </div>
    <span style="color:{muted};font-size:13px;background:{card_bg};padding:4px 12px;border-radius:8px;border:1px solid {border};white-space:nowrap;">{e.get("duration","")}</span>
  </div>
  <p style="color:{muted};line-height:1.8;font-size:15px;margin:0;">{e.get("description","")}</p>
</div>'''
        for e in (data.get("experience") or [])
    ])

    education_html = "".join([
        f'''<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;background:{card_bg};border-radius:14px;border:1px solid {border};margin-bottom:12px;flex-wrap:wrap;gap:12px;">
  <div>
    <h3 style="font-size:17px;font-weight:600;color:{text_color};margin:0 0 4px;">{e.get("degree","")}</h3>
    <p style="color:{muted};font-size:14px;margin:0;">{e.get("institution","")}</p>
  </div>
  <div style="text-align:right;">
    <p style="color:{accent};font-size:15px;font-weight:600;margin:0 0 2px;">{e.get("year","")}</p>
    {f'<p style="color:{muted};font-size:13px;margin:0;">CGPA: {e.get("cgpa")}</p>' if e.get("cgpa") else ""}
  </div>
</div>'''
        for e in (data.get("education") or [])
    ])

    achievements_html = ""
    if data.get("achievements"):
        items = "".join([f'<li style="color:{muted};font-size:15px;margin-bottom:10px;line-height:1.7;">{a}</li>' for a in data.get("achievements", [])])
        achievements_html = f'''<section style="padding:64px 0;">
  <div style="margin-bottom:12px;width:48px;height:3px;background:{accent};border-radius:2px;"></div>
  <h2 style="font-size:30px;font-weight:800;color:{text_color};margin-bottom:8px;">Achievements</h2>
  <p style="color:{muted};margin-bottom:36px;font-size:15px;">Milestones & recognition</p>
  <ul style="padding-left:20px;">{items}</ul>
</section>'''

    name = data.get("name", "Portfolio")
    first_name = name.split()[0] if name else "Dev"

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{name} - {data.get("title","Developer")} Portfolio">
<title>{name} | Portfolio</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  html{{scroll-behavior:smooth}}
  body{{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:{bg};color:{text_color};line-height:1.6;}}
  .container{{max-width:920px;margin:0 auto;padding:0 24px}}
  nav{{position:sticky;top:0;background:{nav_bg};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid {border};z-index:100;padding:14px 0}}
  .nav-inner{{display:flex;justify-content:space-between;align-items:center}}
  .logo{{font-size:20px;font-weight:800;color:{accent};letter-spacing:-0.5px}}
  .nav-links a{{color:{muted};text-decoration:none;margin-left:28px;font-size:14px;font-weight:500;transition:color 0.2s}}
  .nav-links a:hover{{color:{text_color}}}
  .burger{{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:4px}}
  .burger span{{width:22px;height:2px;background:{muted};border-radius:2px;transition:all 0.3s}}
  .hero{{padding:110px 0 90px;text-align:center}}
  .badge{{display:inline-block;padding:7px 18px;background:{accent}1a;color:{accent};border:1px solid {accent}33;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:28px;letter-spacing:0.02em}}
  .hero-name{{font-size:clamp(40px,7vw,72px);font-weight:900;line-height:1.08;margin-bottom:20px;background:linear-gradient(135deg,{text_color} 0%,{accent} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-2px}}
  .hero-title{{font-size:20px;color:{muted};margin-bottom:20px;font-weight:400}}
  .hero-bio{{font-size:16px;color:{muted};max-width:580px;margin:0 auto 36px;line-height:1.85}}
  .hero-links{{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}}
  .btn{{padding:13px 30px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;transition:all 0.2s;display:inline-block}}
  .btn-primary{{background:{accent};color:#fff;box-shadow:0 4px 24px {accent}44}}
  .btn-primary:hover{{transform:translateY(-1px);box-shadow:0 8px 32px {accent}66}}
  .btn-outline{{border:1px solid {border};color:{text_color};background:transparent}}
  .btn-outline:hover{{background:{card_bg};border-color:{accent}44}}
  section{{padding:64px 0}}
  h2{{font-size:30px;font-weight:800;margin-bottom:8px;color:{text_color};letter-spacing:-0.5px}}
  .section-sub{{color:{muted};margin-bottom:40px;font-size:15px}}
  .divider{{width:48px;height:3px;background:{accent};border-radius:2px;margin-bottom:16px}}
  .stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-bottom:48px}}
  .stat{{text-align:center;padding:20px;background:{card_bg};border-radius:14px;border:1px solid {border}}}
  .stat-num{{font-size:32px;font-weight:800;color:{accent};margin-bottom:4px}}
  .stat-label{{font-size:13px;color:{muted}}}
  footer{{border-top:1px solid {border};padding:36px 0;text-align:center;color:{muted};font-size:14px}}
  footer a{{color:{accent};text-decoration:none}}
  @media(max-width:640px){{
    .nav-links{{display:none}}.nav-links.open{{display:flex;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:{bg};border-bottom:1px solid {border};padding:16px 24px;gap:12px}}
    .burger{{display:flex}}.hero{{padding:80px 0 60px}}.hero-name{{font-size:36px}}.btn{{width:100%;text-align:center}}
    .hero-links{{flex-direction:column;align-items:center}}
  }}
</style>
</head>
<body>
<nav>
  <div class="container nav-inner">
    <div class="logo">{first_name}.dev</div>
    <div class="nav-links" id="navLinks">
      <a href="#about">About</a>
      <a href="#projects">Projects</a>
      <a href="#skills">Skills</a>
      {"<a href='#experience'>Experience</a>" if data.get("experience") else ""}
      <a href="#contact">Contact</a>
    </div>
    <div class="burger" onclick="document.getElementById('navLinks').classList.toggle('open')" aria-label="Menu">
      <span></span><span></span><span></span>
    </div>
  </div>
</nav>
<div class="container">
  <div class="hero" id="about">
    <div class="badge">👋 Open to Opportunities</div>
    <h1 class="hero-name">{name}</h1>
    <p class="hero-title">{data.get("title","Software Developer")}</p>
    <p class="hero-bio">{data.get("bio","")}</p>
    <div class="hero-links">
      {f'<a href="mailto:{data.get("email")}" class="btn btn-primary">Hire Me →</a>' if data.get("email") else ""}
      {f'<a href="{data.get("github")}" target="_blank" class="btn btn-outline">GitHub</a>' if data.get("github") else ""}
      {f'<a href="{data.get("linkedin")}" target="_blank" class="btn btn-outline">LinkedIn</a>' if data.get("linkedin") else ""}
    </div>
  </div>
  <div class="stats">
    {f'<div class="stat"><div class="stat-num">{len(data.get("projects",[]))}</div><div class="stat-label">Projects Built</div></div>' if data.get("projects") else ""}
    {f'<div class="stat"><div class="stat-num">{len(data.get("skills",[]))}</div><div class="stat-label">Technologies</div></div>' if data.get("skills") else ""}
    {f'<div class="stat"><div class="stat-num">{len(data.get("experience",[]))}</div><div class="stat-label">Experiences</div></div>' if data.get("experience") else ""}
    <div class="stat"><div class="stat-num">✓</div><div class="stat-label">Available for Work</div></div>
  </div>
  {f'<section id="projects"><div class="divider"></div><h2>Projects</h2><p class="section-sub">Things I\'ve built that I\'m proud of</p>{projects_html}</section>' if projects_html else ""}
  {f'<section id="skills"><div class="divider"></div><h2>Skills & Technologies</h2><p class="section-sub">Tools I work with daily</p><div>{skills_html}</div></section>' if skills_html else ""}
  {f'<section id="experience"><div class="divider"></div><h2>Experience</h2><p class="section-sub">Where I\'ve contributed</p>{experience_html}</section>' if experience_html else ""}
  {f'<section><div class="divider"></div><h2>Education</h2><p class="section-sub">Academic background</p>{education_html}</section>' if education_html else ""}
  {achievements_html}
  <section id="contact">
    <div class="divider"></div>
    <h2>Let's Work Together</h2>
    <p class="section-sub">I'm currently looking for new opportunities — my inbox is always open!</p>
    <div class="hero-links" style="justify-content:flex-start;">
      {f'<a href="mailto:{data.get("email")}" class="btn btn-primary">Send a Message →</a>' if data.get("email") else ""}
      {f'<a href="tel:{data.get("phone")}" class="btn btn-outline">{data.get("phone")}</a>' if data.get("phone") else ""}
    </div>
  </section>
</div>
<footer>
  <div class="container">
    <p>Designed & Built by <strong>{name}</strong> · {data.get("location","")}</p>
    <p style="margin-top:8px;font-size:12px;opacity:0.5;">Made with <a href="https://portfolioai.vercel.app">PortfolioAI</a></p>
  </div>
</footer>
</body>
</html>'''


@app.post("/api/generate-from-text")
async def generate_from_text(request: GenerateRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required")
    try:
        data = parse_resume_with_ai(request.resume_text)
        html = generate_html(data, request.template)
        return {"success": True, "data": data, "html": html}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI parsing failed. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-from-pdf")
async def generate_from_pdf(
    file: UploadFile = File(...),
    template: str = Form("noir")
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    try:
        text = extract_pdf_text(content)
        data = parse_resume_with_ai(text)
        html = generate_html(data, template)
        return {"success": True, "data": data, "html": html}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI parsing failed. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/api/download-zip")
async def download_zip(request: GenerateRequest):
    try:
        data = parse_resume_with_ai(request.resume_text)
        html = generate_html(data, request.template)
        name_slug = (data.get("name") or "portfolio").lower().replace(" ", "-")
        tmp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(tmp_dir, f"{name_slug}-portfolio.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("index.html", html)
            zf.writestr("README.txt", "Deploy by dragging index.html to netlify.com/drop")
        return FileResponse(zip_path, media_type="application/zip", filename=f"{name_slug}-portfolio.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "PortfolioAI API is running"}


@app.get("/")
async def root():
    return {"message": "PortfolioAI API", "docs": "/docs"}
