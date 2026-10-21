# BrandShield AI 🛡️

**AI Governance Workspace for Responsible Brand Content**

BrandShield AI is a brand-governance platform that helps teams review marketing content, identify potential brand guideline violations, and improve messaging before publication.

## ✨ Features

- **Content Audit:** Review content against configured brand guidelines.
- **Smart Rewrite:** Improve marketing wording and address flagged phrases.
- **Custom Brand Guidelines:** Configure prohibited phrases and required terms.
- **Audit History:** Review previous content audits and their findings.
- **Overview Dashboard:** View audit statistics and recent activity.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Python, FastAPI
- **Data Storage:** Browser localStorage for audit history and configurable guidelines

## 🚀 Getting Started

### Prerequisites

- Python installed
- Node.js and npm installed
- Git installed

### 1. Clone the repository

```bash
git clone https://github.com/LakshmiRajaguru/BrandShieldAI.git
cd BrandShieldAI
```

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Backend API documentation: http://127.0.0.1:8000/docs

### 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually http://localhost:5173.

## 🎯 Project Goal

Help teams maintain consistent brand messaging and identify potentially risky promotional claims before content is published.

## 👩‍💻 Author

**Lakshmi Rajaguru**

GitHub: https://github.com/LakshmiRajaguru

## 📸 Project Screenshots

### Dashboard
![BrandShield AI Dashboard](screenshots/Screenshot%202026-10-21%20195356.png)

### Content Audit
![BrandShield AI Content Audit](screenshots/Screenshot%202026-10-21%20195422.png)

### Smart Rewrite
![BrandShield AI Smart Rewrite](screenshots/Screenshot%202026-10-21%20195500.png)

### Brand Guidelines
![BrandShield AI Brand Guidelines](screenshots/Screenshot%202026-10-21%20195534.png)

---

*BrandShield AI supports responsible brand governance. Human review is recommended before publication.*
