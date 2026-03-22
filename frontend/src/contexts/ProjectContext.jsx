import React, { createContext, useContext, useState, useCallback } from 'react';
import { projects as projectsApi, files as filesApi, collaboration as collabApi } from '../api';

const ProjectContext = createContext(null);

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Projects ────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.listPublic();
      setProjects(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async ({ name, language, is_public = false }) => {
    const proj = await projectsApi.create({
      name,
      language: language.toLowerCase(),
      source_code: getDefaultContent(language),
      is_public,
    });
    setProjects((prev) => [proj, ...prev]);
    return proj;
  };

  const updateProject = async (id, updates) => {
    const updated = await projectsApi.updateMeta(id, updates);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProject = async (id) => {
    await projectsApi.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const getProject = (id) => projects.find((p) => p.id === id);

  // ── Files ───────────────────────────────────────────────────────────────────

  const fetchFiles = async (projectId) => {
    return filesApi.list(projectId);
  };

  const createFile = async (projectId, { name, language, content = '', parent_id = null }) => {
    return filesApi.create(projectId, { name, language, content, parent_id });
  };

  const updateFileContent = async (projectId, fileId, content) => {
    return filesApi.updateContent(projectId, fileId, content);
  };

  const renameFile = async (projectId, fileId, name) => {
    return filesApi.rename(projectId, fileId, name);
  };

  const deleteFile = async (projectId, fileId) => {
    return filesApi.delete(projectId, fileId);
  };

  // ── Collaboration ────────────────────────────────────────────────────────────

  const listCollaborators = async (projectId) => {
    return collabApi.list(projectId);
  };

  const inviteCollaborator = async (projectId, email, role) => {
    return collabApi.invite(projectId, email, role);
  };

  const removeCollaborator = async (projectId, userId) => {
    return collabApi.remove(projectId, userId);
  };

  const changeCollaboratorRole = async (projectId, userId, role) => {
    return collabApi.changeRole(projectId, userId, role);
  };

  const listPendingInvitations = async () => {
    return collabApi.listPending();
  };

  const acceptInvitation = async (projectId) => {
    return collabApi.accept(projectId);
  };

  // ── Share links ──────────────────────────────────────────────────────────────

  const generateShareLink = async (projectId) => {
    return projectsApi.generateShareLink(projectId);
  };

  const revokeShareLink = async (projectId) => {
    return projectsApi.revokeShareLink(projectId);
  };

  return (
    <ProjectContext.Provider value={{
      projects, loading, error,
      fetchProjects, fetchPublicProjects,
      createProject, updateProject, deleteProject, getProject,
      fetchFiles, createFile, updateFileContent, renameFile, deleteFile,
      listCollaborators, inviteCollaborator, removeCollaborator, changeCollaboratorRole,
      listPendingInvitations, acceptInvitation,
      generateShareLink, revokeShareLink,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

// ── Language templates ────────────────────────────────────────────────────────

function getDefaultContent(language) {
  const templates = {
    Python:     '# Welcome to CodeJAM!\nprint("Hello, World!")',
    TypeScript: 'console.log("Hello, World!");',
    JavaScript: 'console.log("Hello, World!");',
    Java:       'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    Go:         'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    Rust:       'fn main() {\n    println!("Hello, World!");\n}',
    'C++':      '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    C:          '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  };
  return templates[language] || '// Start coding...';
}