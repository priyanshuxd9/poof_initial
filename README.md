
# Poof - Ephemeral Group Chats

Poof is a modern web application for creating temporary, self-destructing group chats. It provides a secure and private platform for conversations that automatically disappear after a user-defined timer, ensuring that what's said in Poof, stays in Poof... and then vanishes.

## Core Features

-   **Secure Authentication**:
    -   User sign-up and sign-in with email, a unique username, and password.
    -   Secure session management with Firebase Authentication.
    -   Password reset functionality.
    -   Passwordless sign-in with Email Magic Links.
-   **User Profiles**:
    -   Users can update their username.
    -   Customizable profile pictures with automatic image compression on upload.
-   **Group Management**:
    -   **Create Groups**: Easily start new groups with a name, description, and custom icon.
    -   **AI-Powered Assistance**:
        -   Generate creative group descriptions based on the group's name, purpose, and theme.
        -   Get AI-driven suggestions for an appropriate self-destruct timer duration.
    -   **Join Groups**: Seamlessly join existing groups using a unique, shareable 8-character invite code.
    -   **Group Info**: A dedicated page to view group details, including the creator and a list of all members.
-   **Real-Time Chat**:
    -   Instant text messaging within groups powered by Firestore's real-time capabilities.
    -   **Emoji Reactions**: React to any message with a thumbs-up or a selection of other emojis.
    -   Real-time display of user avatars and usernames, which update instantly if a user changes their profile.
-   **Self-Destruct Timer**:
    -   Each group has a mandatory self-destruct timer, configurable from 1 to 31 days.
    -   A progress bar in the chat header shows the remaining time.
    -   A prominent warning is displayed when less than 15% of the group's lifetime remains.
-   **Dashboard**:
    -   A personalized dashboard lists all of the user's active groups.
    -   Groups are sorted by their expiration date, showing which will "Poof" soonest.
-   **Modern UI/UX**:
    -   Clean, responsive interface that works on desktop and mobile.
    -   Light and Dark mode support, with an option to follow the system theme.
    -   Polished components with smooth transitions and a professional feel.
    -   Toasts and notifications for a better user experience.

## Tech Stack

This project is built with a modern, robust tech stack:

-   **Frontend**:
    -   **Next.js**: React framework for server-side rendering and static site generation (using App Router).
    -   **React**: JavaScript library for building user interfaces.
    -   **TypeScript**: Superset of JavaScript that adds static typing.
-   **UI & Styling**:
    -   **ShadCN UI**: Re-usable UI components built on Radix UI and Tailwind CSS.
    -   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
    -   **Lucide React**: Library for beautiful and consistent icons.
    -   **date-fns**: For elegant and reliable date formatting.
-   **Backend & Database**:
    -   **Firebase**:
        -   **Authentication**: Manages user sign-up, sign-in, and sessions.
        -   **Firestore**: NoSQL database for storing group information, messages, and user data.
        -   **Storage**: For storing user profile pictures and group icons.
-   **Artificial Intelligence**:
    -   **Genkit (by Firebase)**: Toolkit for building AI-powered features, connected to Google's Gemini models.
-   **State Management**:
    -   React Context API (for global authentication state).
-   **Forms**:
    -   React Hook Form with Zod for robust form validation.
-   **Utilities**:
    -   `browser-image-compression`: For client-side image compression to reduce storage and bandwidth.

## Styling Guidelines

The app aims for a clean, modern, and user-friendly interface:

-   **Primary Color**: Calming Blue (`#5BB3D4`, `hsl(198 56% 59%)`) - Fosters trust and reliability.
-   **Background Color**: Light Desaturated Blue (`#E3F2FD`, `hsl(202 93% 94%)`) - Clean and unobtrusive.
-   **Accent Color**: Dark Blue (`#0B4763`, `hsl(201 81% 21%)`) - Highlights interactive elements and important notifications.
-   **Font**: Poppins - Clean and readable for clear communication.
-   **Icons**: Lucide React - Simple, outline-style icons for a minimalist design.

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

-   Node.js (v18 or later recommended)
-   npm or yarn
-   A Firebase project

### 1. Firebase Project Setup

Before running the app, you need to set up a Firebase project:

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  In the project dashboard, go to the **Build** section in the left sidebar.
3.  **Authentication**:
    -   Enable Authentication.
    -   On the "Sign-in method" tab, click **Add new provider** and select **Email/Password**.
    -   Enable the **Email/Password** provider toggle.
    -   Crucially, also enable the **Email link (passwordless sign-in)** toggle within the same provider section.
    -   Save the changes.
4.  **Firestore Database**:
    -   Create a new Firestore database.
    -   Start in **production mode**. This is crucial for security.
    -   After creation, go to the **Rules** tab, delete the default rules, and paste the entire content of the `firestore.rules` file from this repository. Publish the changes.
5.  **Storage**:
    -   Enable Cloud Storage.
    -   Follow the prompts to create a storage bucket.
    -   After creation, go to the **Rules** tab, delete the default rules, and paste the entire content of the `storage.rules` file from this repository. Publish the changes.
6.  **Get Web App Credentials**:
    -   Go to your Project Settings (click the gear icon).
    -   In the "General" tab, scroll down to "Your apps".
    -   Click the `</>` icon to add a new Web app.
    -   Give it a nickname and register the app.
    -   Firebase will provide you with a `firebaseConfig` object. You will need these values for the next step.

### 2. Local Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/poof-app.git
    cd poof-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables**:
    Create a `.env` file in the root of the project and populate it with your Firebase and Google AI credentials.

    ```env
    # Firebase Configuration - Get these from your Firebase project settings
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # For Genkit (Google AI Studio / Vertex AI)
    # Get this from https://aistudio.google.com/app/apikey
    GOOGLE_API_KEY=your_google_ai_api_key
    ```

### 3. Running the Application

This project requires two separate development servers to be running simultaneously: one for the Next.js frontend and one for the Genkit AI backend.

1.  **Run the Next.js development server**:
    This command starts the main application.
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:9002`.

2.  **Run the Genkit development server**:
    Open a **new terminal window** in the same project directory and run:
    ```bash
    npm run genkit:watch
    ```
    This starts the Genkit server (typically on `http://localhost:4000`) and watches for changes in your AI flow files.

You're all set! You can now access the app in your browser.

## Project Structure

-   `src/app/`: Next.js App Router pages and layouts.
    -   `(app)/`: Authenticated routes (dashboard, groups, profile, etc.).
    -   `auth/`: Authentication pages (sign-in).
    -   `layout.tsx`: The root layout for the entire application.
    -   `page.tsx`: The landing page that redirects users.
-   `src/components/`: Reusable UI components.
    -   `auth/`: Authentication form.
    -   `chat/`: Components for the chat interface (message list, input, header).
    -   `groups/`: Components for group creation and joining.
    -   `shared/`: Common components like the Logo and AppHeader.
    -   `ui/`: ShadCN UI components (Button, Card, etc.).
-   `src/contexts/`: React Context API for global state (e.g., `auth-context.tsx`).
-   `src/hooks/`: Custom React hooks (`use-toast.ts`, `use-mobile.ts`).
-   `src/lib/`: Core utilities and Firebase setup (`firebase.ts`, `utils.ts`).
-   `src/ai/`: Genkit configuration and AI flows.
    -   `flows/`: Specific AI-powered flows (e.g., `generate-group-description.ts`).
    -   `genkit.ts`: Genkit initialization.
-   `firestore.rules`: Security rules for the Firestore database.
-   `storage.rules`: Security rules for Cloud Storage.
-   `public/`: Static assets.
-   `tailwind.config.ts`: Tailwind CSS configuration.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a Next.js production server.
-   `npm run lint`: Lints the project files.
-   `npm run typecheck`: Runs TypeScript type checking.
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server with file watching.

