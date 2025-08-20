# EchoLearn – Voice-Interactive Learning Companion

> **Privacy-first • No login • AI-powered • Offline-capable**

EchoLearn is a smart, voice-driven study tool that turns any text into interactive flashcards using AI. Paste an article, get AI-generated Q&A pairs, and review them, all without logging in or sending your data to the cloud.

Built with **React, Node.js, and Google Gemini API**, EchoLearn is designed for active learners who want a fast, private, and engaging way to study — anytime, anywhere.

---

## 🚀 Features

- ✅ **Paste-to-Flashcards** – Extract key concepts from any text using Google Gemini
- ✅ **Text-to-Speech** – Hear answers aloud
- ✅ **Spaced Repetition** – Smart review scheduling for retention
- ✅ **No Authentication** – No accounts, no tracking, 100% private
- ✅ **PWA Ready** – Installable on desktop & mobile

---

## 🛠 Tech Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Frontend | React + Vite, Tailwind CSS                           |
| Backend  | Node.js + Express                                    |
| AI       | Google Gemini API                                    |
| Voice    | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| Storage  | IndexedDB                                            |

---

## 🖥 Local Development

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/echolearn.git
cd echolearn
```

### 2. Backend setup

```bash
cd backend
cp config.env.example config.env
# Add your Gemini API key: https://aistudio.google.com/app/apikey
npm install
```

### 3. Frontend setup

```bash
cd ../Front End
npm install
```

### 4. Run apps

```bash
# Backend
npm run dev

# Frontend
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## 🔐 Environment Variables

Create `backend/config.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

⚠️ Do **not** commit this file. It’s already in `.gitignore`.

---

## 🧩 How It Works

1. **Paste text** into input box
2. Backend sends text to Gemini → generates Q&A pairs
3. Flashcards appear and save to IndexedDB

---

## 📸 Screenshots

![App Screenshot 1](./ScreenShots/Screenshot%202025-08-20%20180123.png)
![App Screenshot 2](./ScreenShots/Screenshot%202025-08-20%20180141.png)
![App Screenshot 3](./ScreenShots/Screenshot%202025-08-20%20180155.png)
![App Screenshot 4](./ScreenShots/Screenshot%202025-08-20%20180212.png)

---

## 🙌 Contributing

PRs welcome! Please open an issue first to discuss ideas.
