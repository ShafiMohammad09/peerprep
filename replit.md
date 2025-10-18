# PeerPrep

## Overview
PeerPrep is a peer-to-peer mock interview platform where users can book 30-minute slots to practice with others. It uses a 'Star' system for booking and simulates matching users for Google Meet interviews.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite
- Backend/Services: Firebase (Auth & Firestore)
- AI: Google Gemini API
- Styling: Tailwind CSS (via CDN)

**Current State:**
The application has been successfully configured to run in the Replit environment. The frontend is running on port 5000 with proper Vite configuration for the Replit proxy.

## Recent Changes (October 18, 2025)
- Installed Node.js dependencies
- Updated Vite config to use port 5000 (required for Replit)
- Configured `allowedHosts: true` to support Replit's dynamic proxy domains
- Configured HMR (Hot Module Reload) for proper proxy support
- Updated Firebase configuration to support environment variables with fallbacks
- Set up dev workflow for frontend server
- Configured deployment settings for autoscale deployment

## Project Architecture

### Frontend Structure
- `/components/` - React components (Login, Dashboard, icons)
- `/context/` - React Context for app state management (AppContext)
- `App.tsx` - Main application component
- `index.tsx` - Application entry point
- `firebase.ts` - Firebase initialization and exports

### Firebase Functions
- `/functions/` - Cloud Functions directory (separate package.json)
- `/functions/src/index.ts` - Cloud Functions implementation

### Configuration Files
- `vite.config.ts` - Vite configuration (port 5000, allowedHosts for Replit proxy, HMR, environment variables)
- `tsconfig.json` - TypeScript configuration
- `firestore.rules` - Firestore security rules

## Environment Variables

### Required Secrets
- `GEMINI_API_KEY` - Google Gemini API key for AI features

### Optional Firebase Environment Variables
The app includes fallback values for Firebase config, but you can override them with:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Development

### Running Locally
The app runs automatically via the configured workflow:
```bash
npm run dev
```
Server runs on port 5000 at http://0.0.0.0:5000/

### Building for Production
```bash
npm run build
```

### Deployment
Configured for autoscale deployment on Replit:
- Build command: `npm run build`
- Run command: `npx vite preview --host 0.0.0.0 --port 5000`

## Key Features
- Google Authentication via Firebase
- User dashboard for booking mock interviews
- Star-based booking system
- AI-powered features using Gemini API
- Firebase Firestore for data persistence

## Notes
- Tailwind CSS is currently loaded via CDN (not recommended for production)
- Firebase configuration includes hardcoded fallback values for the existing project
- The app is ready to run and deploy in the Replit environment
