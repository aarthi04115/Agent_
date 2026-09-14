# 🌸 CycleCare: AI-Powered Household Menstrual Wellness

<div align="center">
  <p><strong>Private, supportive visibility into your family's cycle rhythms.</strong></p>
</div>

---

## ✨ Overview

CycleCare is a comprehensive, AI-powered menstrual cycle tracking ecosystem designed specifically for households. Built with a powerful **React Native / Expo** frontend and a highly secure **FastAPI (Python)** backend, CycleCare bridges the gap between personal cycle privacy and family awareness.

Instead of generic cycle tracking, CycleCare features an intelligent **Groq-powered AI Assistant** and a specialized **Role-Based Access Control (RBAC)** system that allows mothers to seamlessly oversee, manage, and synchronize their daughters' cycle health in one unified dashboard.

## 🚀 Key Features

### 👩‍👧 Intelligent Household Roles
- **Daughter Accounts:** A private, personal cycle history with full access to predictive insights, calendar views, and personalized AI guidance.
- **Mother Accounts:** A powerful overarching view. Mothers have read-write access to their daughters' cycles, allowing them to instantly see predicted dates, configure unified household reminders, or use the AI to log periods on their daughters' behalf.

### 🧠 Generative AI Assistant
- Powered by the lightning-fast **Groq AI (Llama 3.1)**.
- **Action-Oriented Intent:** Simply say *"My daughter's period started today"* and the AI will automatically parse the intent, find the correct account, and log the data seamlessly.
- **Context-Aware Wellness:** Provides generalized, non-diagnostic menstrual wellness information while strictly adhering to safety guardrails.

### 📊 Deterministic Cycle Science
- **Precision Tracking:** Calculates complex cycle variations, rolling averages, and highly accurate next-period predictions entirely on the server.
- **Automated Reconciliations:** Smart local push notifications generated via server-side prediction data, ensuring reminders trigger exactly when needed without draining mobile battery.

## 🛠 Tech Stack

### Frontend (Mobile & Web)
- **Framework:** React Native / Expo
- **Styling:** Custom StyleSheet architecture tailored for rich aesthetics (Glassmorphism, curated palettes, modern typography).
- **State & Storage:** React Context API and AsyncStorage.
- **Deployment:** Vercel (Web App) & EAS Build (Android APK).

### Backend (API)
- **Framework:** FastAPI (Python 3.11)
- **AI Integration:** Groq SDK
- **Authentication:** JWT (JSON Web Tokens) with PBKDF2 Password Hashing.
- **Database:** PostgreSQL (Production on Render) / SQLite (Local fallback).
- **Deployment:** Render (Web Service).

---

## 💻 Deployment & Installation

CycleCare is designed to run completely in the cloud using **Render** and **Vercel**. 

### 1. Backend (Render)
The backend requires a persistent PostgreSQL database.
1. Create a PostgreSQL Database on Render.
2. Deploy the FastAPI app.
3. Set the following environment variables:
   - `DATABASE_URL`: Your Render Internal PostgreSQL Connection string.
   - `AI_API_KEY`: Your Groq API Key (starts with `gsk_`).
   - `CORS_ORIGINS`: Your Vercel frontend URL.

### 2. Frontend (Vercel & Mobile)
The frontend can be built for both Web and Android natively.
1. **Web:** Deploy the `mobile` folder directly to Vercel. Ensure `EXPO_PUBLIC_API_URL` is set to your Render backend URL.
2. **Android APK:** Run the following command via the Expo CLI to generate a downloadable APK file:
   ```bash
   eas build -p android --profile preview
   ```

## 🔒 Security & Privacy

CycleCare strictly adheres to health-data privacy best practices:
- **No Diagnostics:** The AI is strictly sandboxed from providing medical diagnoses.
- **Encrypted Communication:** All communication is secured via TLS/SSL.
- **Tokenized Access:** Every API route verifies explicit permissions based on the encrypted JWT payload.

---
*CycleCare is an advanced agentic coding demonstration, built to showcase complex AI system architecture, dynamic role-based access, and seamless modern UI/UX design.*
