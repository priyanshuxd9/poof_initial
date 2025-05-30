
# Poof - Ephemeral Group Chats

Poof is a web application that allows users to create temporary, self-destructing group chats. The core idea is to provide a platform for ephemeral conversations that automatically disappear after a set timer, ensuring privacy and a clean slate.

## Core Features

-   **Email Authentication**: Secure user sign-up and sign-in using email and a unique username.
-   **Text Chat**: Real-time, plain text messaging within groups.
-   **Emoji Reactions**: Users can react to messages with emojis to enhance communication.
-   **Multimedia Sharing**: Share photos and videos within groups (up to 30MB per file).
-   **Unique Invite Code**: Each group has a unique, shareable invite code for easy joining (no passwords needed for invites).
-   **Self-Destruct Timer**: Groups automatically "Poof" (all content deleted and group disbanded) after a user-defined timer (1 to 31 days). A warning is displayed when 15% of the time remains.

## Tech Stack

This project is built with a modern, robust tech stack:

-   **Frontend**:
    -   **Next.js**: React framework for server-side rendering, static site generation, and more (using App Router).
    -   **React**: JavaScript library for building user interfaces.
    -   **TypeScript**: Superset of JavaScript that adds static typing.
-   **UI & Styling**:
    -   **ShadCN UI**: Re-usable UI components built on Radix UI and Tailwind CSS.
    -   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
    -   **Lucide React**: Library for beautiful and consistent icons.
-   **Backend & Database**:
    -   **Firebase**:
        -   **Authentication**: Manages user sign-up, sign-in, and sessions.
        -   **Firestore**: NoSQL database for storing group information, messages, and user data (Note: Currently using a mock implementation in `src/lib/firebase.ts`).
        -   **Storage**: For storing multimedia files shared in chats (Note: Currently using a mock implementation).
-   **Artificial Intelligence**:
    -   **Genkit (by Firebase)**: Toolkit for building AI-powered features, used for:
        -   Generating group descriptions.
        -   Suggesting self-destruct timer durations.
-   **State Management**:
    -   React Context API (for authentication state).
-   **Forms**:
    -   React Hook Form with Zod for validation.

## Styling Guidelines

The app aims for a clean, modern, and user-friendly interface:

-   **Primary Color**: Calming Blue (`#5BB3D4`, `hsl(198 56% 59%)`) - Fosters trust and reliability.
-   **Background Color**: Light Desaturated Blue (`#E3F2FD`, `hsl(202 93% 94%)`) - Clean and unobtrusive.
-   **Accent Color**: Dark Blue (`#0B4763`, `hsl(201 81% 21%)`) - Highlights interactive elements and important notifications.
-   **Font**: Poppins - Clean and readable for clear communication.
-   **Icons**: Lucide React - Simple, outline-style icons for a minimalist design.
-   **Layout**: Clean, uncluttered, focusing on chat content. Responsive design for various screen sizes.
-   **Animations**: Smooth transitions and subtle animations for a polished user experience.

## Getting Started

### Prerequisites

-   Node.js (v18 or later recommended)
-   npm or yarn

### Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd poof-app 
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables**:
    Create a `.env` file in the root of the project. For Firebase connectivity, you would typically add your Firebase project configuration keys here.
    Example `.env` file:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # For Genkit (Google AI Studio / Vertex AI)
    GOOGLE_API_KEY=your_google_ai_api_key
    ```
    *Note: The current `src/lib/firebase.ts` uses a mock implementation. For a real Firebase backend, you'll need to replace the mock and provide actual Firebase config values.*

4.  **Run the development server**:
    This command starts the Next.js development server.
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:9002`.

5.  **Run the Genkit development server** (for AI features):
    Open a new terminal and run:
    ```bash
    npm run genkit:dev
    # or for watching changes
    npm run genkit:watch
    ```
    Genkit typically starts on `http://localhost:4000`.

## Project Structure

-   `src/app/`: Next.js App Router pages and layouts.
    -   `(app)/`: Authenticated routes (dashboard, groups).
    -   `auth/`: Authentication related pages (sign-in).
-   `src/components/`: Reusable UI components.
    -   `auth/`: Authentication form.
    -   `chat/`: Components for the chat interface.
    -   `groups/`: Components for group creation and display.
    -   `shared/`: Common components like Logo, AppHeader.
    -   `ui/`: ShadCN UI components.
-   `src/contexts/`: React Context API for global state (e.g., `auth-context.tsx`).
-   `src/hooks/`: Custom React hooks (e.g., `use-toast.ts`, `use-mobile.ts`).
-   `src/lib/`: Utility functions and Firebase setup (`firebase.ts`, `utils.ts`).
-   `src/ai/`: Genkit configuration and flows.
    -   `flows/`: Specific AI-powered flows (e.g., `generate-group-description.ts`).
    -   `genkit.ts`: Genkit initialization.
-   `public/`: Static assets.
-   `tailwind.config.ts`: Tailwind CSS configuration.
-   `next.config.ts`: Next.js configuration.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server (with Turbopack on port 9002).
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a Next.js production server.
-   `npm run lint`: Lints the project files using Next.js's built-in ESLint configuration.
-   `npm run typecheck`: Runs TypeScript type checking.
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server with file watching.

