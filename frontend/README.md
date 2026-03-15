# CodeJAM - Online Code Playground

A professional, modern online code playground supporting multiple programming languages with real-time execution and collaboration features.

## Features

### Core Features
- 🚀 **Multi-language Support** - Python, JavaScript, TypeScript, Java, Go, Rust, C++, C
- ⚡ **Instant Execution** - Run code directly in the browser
- 📁 **File Management** - Create, edit, and organize multiple files per project
- 🔒 **Privacy Controls** - Public and private project visibility
- 🎨 **Modern UI** - Clean, professional interface with smooth animations
- 💾 **Auto-save** - Automatic project saving to local storage

### Collaboration Features
- 🔗 **Share Links** - Generate shareable links for projects
- 📧 **Email Invitations** - Invite collaborators via email
- 🔔 **Collaboration Requests** - Approve/deny collaboration access
- 👥 **Real-time Sharing** - Share projects with team members

### Project Management
- 📂 **Multiple Projects** - Create and manage unlimited projects
- 📝 **Multiple Files** - Add multiple files and folders to projects
- 🏷️ **Project Organization** - Organize by language, visibility, and date
- 🔍 **Search** - Quick search across all projects

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository or extract the project files

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
codejam-project/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── CreateProjectModal.jsx
│   │   └── ShareModal.jsx
│   ├── contexts/            # React contexts for state management
│   │   ├── AuthContext.jsx
│   │   └── ProjectContext.jsx
│   ├── pages/               # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Editor.jsx
│   │   └── ProfilePage.jsx
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Usage

### Creating a Project

1. Click "New Project" on the dashboard
2. Enter project name
3. Select programming language
4. Choose visibility (public/private)
5. Click "Create Project"

### Managing Files

- **Add File**: Click the "+" icon in the file explorer
- **Delete File**: Hover over a file and click the trash icon
- **Switch Files**: Click on any file in the explorer to open it

### Sharing Projects

1. Open a project in the editor
2. Click the "Share" button
3. Choose sharing method:
   - **Copy Link**: Generate and copy a shareable link
   - **Email**: Send invitation to specific email address
4. Collaborators will need approval to access

### Running Code

1. Write your code in the editor
2. Click "Run" to execute
3. View output in the console panel below

## Technology Stack

- **Frontend Framework**: React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React Context API

## Customization

### Adding New Languages

Edit `src/contexts/ProjectContext.jsx` and add to the `languages` array:

```javascript
{
  name: 'NewLanguage',
  icon: '🔥',
  extension: 'ext'
}
```

### Changing Theme Colors

Edit `tailwind.config.js` to customize the color palette:

```javascript
colors: {
  primary: { /* your colors */ },
  accent: { /* your colors */ }
}
```

### Custom Fonts

Update `index.html` to add new Google Fonts, then reference in `tailwind.config.js`.

## Local Storage

Projects are stored in browser local storage under the key `codejam_projects`. User data is stored under `codejam_user`.

**Note**: Clearing browser data will delete all projects.

## Future Enhancements

- [ ] Real-time collaborative editing
- [ ] Integrated terminal
- [ ] Git integration
- [ ] Code snippets library
- [ ] Syntax highlighting themes
- [ ] Export projects
- [ ] Cloud synchronization
- [ ] Mobile app

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue on the GitHub repository.

---

Built with ❤️ using React and Tailwind CSS
