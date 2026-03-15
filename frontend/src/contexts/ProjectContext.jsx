import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext(null);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

// Mock initial projects
const initialProjects = [
  {
    id: '1',
    name: 'Hello Python',
    language: 'Python',
    visibility: 'public',
    updatedAt: '2026-02-15',
    icon: '🐍',
    files: [
      { id: 'f1', name: 'main.py', path: 'main.py', content: '# Welcome to CodeJAM!\nprint("Hello, World!")' }
    ]
  },
  {
    id: '2',
    name: 'React Counter',
    language: 'TypeScript',
    visibility: 'private',
    updatedAt: '2026-02-13',
    icon: '💎',
    files: [
      { id: 'f1', name: 'App.tsx', path: 'App.tsx', content: 'import React, { useState } from "react";\n\nfunction App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <h1>Count: {count}</h1>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}' }
    ]
  },
  {
    id: '3',
    name: 'Fibonacci in Go',
    language: 'Go',
    visibility: 'public',
    updatedAt: '2026-02-12',
    icon: '🐹',
    files: [
      { id: 'f1', name: 'main.go', path: 'main.go', content: 'package main\n\nimport "fmt"\n\nfunc fibonacci(n int) int {\n    if n <= 1 {\n        return n\n    }\n    return fibonacci(n-1) + fibonacci(n-2)\n}\n\nfunc main() {\n    fmt.Println(fibonacci(10))\n}' }
    ]
  },
  {
    id: '4',
    name: 'Sorting Algorithms',
    language: 'Java',
    visibility: 'public',
    updatedAt: '2026-02-10',
    icon: '🔄',
    files: [
      { id: 'f1', name: 'Main.java', path: 'Main.java', content: 'public class Main {\n    public static void bubbleSort(int[] arr) {\n        // Sorting implementation\n    }\n    public static void main(String[] args) {\n        System.out.println("Sorting algorithms");\n    }\n}' }
    ]
  },
  {
    id: '5',
    name: 'Rust CLI Tool',
    language: 'Rust',
    visibility: 'private',
    updatedAt: '2026-02-09',
    icon: '🦀',
    files: [
      { id: 'f1', name: 'main.rs', path: 'main.rs', content: 'fn main() {\n    println!("Hello from Rust!");\n}' }
    ]
  }
];

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [collaborationRequests, setCollaborationRequests] = useState([]);

  useEffect(() => {
    // Load projects from localStorage or use initial projects
    const storedProjects = localStorage.getItem('codejam_projects');
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    } else {
      setProjects(initialProjects);
      localStorage.setItem('codejam_projects', JSON.stringify(initialProjects));
    }
  }, []);

  const createProject = (projectData) => {
    const newProject = {
      id: Date.now().toString(),
      ...projectData,
      updatedAt: new Date().toISOString().split('T')[0],
      files: [
        {
          id: 'f1',
          name: 'main.' + getFileExtension(projectData.language),
          path: 'main.' + getFileExtension(projectData.language),
          content: getDefaultContent(projectData.language)
        }
      ]
    };
    
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
    return newProject;
  };

  const updateProject = (projectId, updates) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
  };

  const deleteProject = (projectId) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
  };

  const getProject = (projectId) => {
    return projects.find(p => p.id === projectId);
  };

  const addFile = (projectId, fileName, folderPath = '') => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    const newFile = {
      id: `f${Date.now()}`,
      name: fileName,
      path: fullPath,
      content: ''
    };

    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? { ...p, files: [...p.files, newFile] }
        : p
    );

    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
  };

  const updateFile = (projectId, fileId, content) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            files: p.files.map(f => f.id === fileId ? { ...f, content } : f)
          }
        : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
  };

  const deleteFile = (projectId, fileId) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? { ...p, files: p.files.filter(f => f.id !== fileId) }
        : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('codejam_projects', JSON.stringify(updatedProjects));
  };

  const requestCollaboration = (projectId, requesterName, requesterEmail) => {
    const request = {
      id: Date.now().toString(),
      projectId,
      requesterName,
      requesterEmail,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    setCollaborationRequests([...collaborationRequests, request]);
  };

  const respondToCollaboration = (requestId, approved) => {
    setCollaborationRequests(
      collaborationRequests.map(req =>
        req.id === requestId
          ? { ...req, status: approved ? 'approved' : 'rejected' }
          : req
      )
    );
  };

  const value = {
    projects,
    collaborationRequests,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    addFile,
    updateFile,
    deleteFile,
    requestCollaboration,
    respondToCollaboration
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// Helper functions
function getFileExtension(language) {
  const extensions = {
    'Python': 'py',
    'TypeScript': 'tsx',
    'JavaScript': 'js',
    'Java': 'java',
    'Go': 'go',
    'Rust': 'rs',
    'C++': 'cpp',
    'C': 'c'
  };
  return extensions[language] || 'txt';
}

function getDefaultContent(language) {
  const templates = {
    'Python': '# Welcome to CodeJAM!\nprint("Hello, World!")',
    'TypeScript': 'console.log("Hello, World!");',
    'JavaScript': 'console.log("Hello, World!");',
    'Java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    'Go': 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    'Rust': 'fn main() {\n    println!("Hello, World!");\n}',
    'C++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    'C': '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
  };
  return templates[language] || '// Start coding...';
}
