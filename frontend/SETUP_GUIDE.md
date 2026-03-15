# CodeJAM Setup Guide

This guide will help you set up and run the CodeJAM project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16 or higher)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`

- **npm** (comes with Node.js)
  - Verify installation: `npm --version`

## Installation Steps

### 1. Navigate to Project Directory

```bash
cd codejam-project
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- React Router
- Tailwind CSS
- Lucide React (icons)
- Vite (build tool)

### 3. Start Development Server

```bash
npm run dev
```

The application will start and you should see output similar to:

```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 4. Open in Browser

Open your browser and navigate to:
```
http://localhost:3000
```

## Project Features Overview

### Landing Page
- Modern gradient design
- Feature showcase
- Login/Register buttons

### Authentication
- Login with any email/password (demo mode)
- Register new account
- Persistent session via localStorage

### Dashboard
- View all projects
- Filter by: My Projects, Shared, Public
- Search functionality
- Create new projects

### Code Editor
- Multi-file support
- File creation and deletion
- Code execution
- Share functionality
- Save projects

### Profile Page
- View account information
- Change password
- Recent projects list

## Default Credentials (Demo Mode)

Since this is a demo application, you can log in with any credentials:
- Email: `demo@codejam.io`
- Password: `password123`

Or create a new account during registration.

## File Structure

```
codejam-project/
├── node_modules/           # Dependencies (created after npm install)
├── public/                 # Static files
├── src/
│   ├── components/         # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── CreateProjectModal.jsx
│   │   └── ShareModal.jsx
│   ├── contexts/          # State management
│   │   ├── AuthContext.jsx
│   │   └── ProjectContext.jsx
│   ├── pages/             # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Editor.jsx
│   │   └── ProfilePage.jsx
│   ├── App.jsx            # Main app
│   ├── main.jsx           # Entry point
│   └── index.css          # Styles
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
└── README.md              # Documentation
```

## Common Commands

### Development
```bash
npm run dev          # Start development server
```

### Production Build
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Vite will automatically try the next available port (3001, 3002, etc.)

### Dependencies Not Installing

Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

### Build Errors

1. Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

2. Ensure Node.js version is 16+:
```bash
node --version
```

### Browser Not Opening

Manually navigate to `http://localhost:3000` in your browser.

## Browser Compatibility

CodeJAM works best in modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Data Storage

All data is stored in browser localStorage:
- **Projects**: `codejam_projects`
- **User**: `codejam_user`

To reset the application, clear browser storage:
- Open DevTools (F12)
- Go to Application/Storage tab
- Clear localStorage

## Next Steps

1. **Explore the UI**: Navigate through all pages
2. **Create a Project**: Try creating a new project with different languages
3. **Test Features**: Test file management, code execution, and sharing
4. **Customize**: Modify colors, fonts, or add new features

## Getting Help

If you encounter any issues:
1. Check the console for errors (F12 → Console tab)
2. Review this guide
3. Check the main README.md for more information

## Production Deployment

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Deployment Options

You can deploy to:
- **Vercel**: `npm i -g vercel && vercel`
- **Netlify**: Drag and drop `dist` folder
- **GitHub Pages**: Configure in repository settings
- **Any static hosting**: Upload `dist` folder contents

---

Happy Coding! 🚀
