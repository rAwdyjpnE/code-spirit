// Базовый URL берется из прокси Vite (/api)
const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  
  const data = isJson ? await response.json() : await response.text();
  
  if (!response.ok) {
    const errorMsg = (data && data.detail) || response.statusText;
    throw new ApiError(errorMsg, response.status);
  }
  
  return data;
};

export const api = {
  // --- Auth & Session ---
  adminLogin: async (sessionId, password) => {
    const formData = new FormData();
    formData.append('username', sessionId);
    formData.append('password', password);
    
    return fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      body: formData,
    }).then(handleResponse);
  },

  createSession: async (password) => {
    return fetch(`${API_BASE}/admin/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(handleResponse);
  },

  // --- Student ---
  registerStudent: async (name, sessionId) => {
    return fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        session_id: sessionId 
      }),
    }).then(handleResponse);
  },

  // --- Tasks Management ---
  getTask: async (userId) => {
    return fetch(`${API_BASE}/student/${userId}/task`).then(handleResponse);
  },

  getAllTasks: async (token) => {
    return fetch(`${API_BASE}/admin/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(handleResponse);
  },

  createTask: async (token, taskData) => {
    return fetch(`${API_BASE}/admin/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(taskData)
    }).then(handleResponse);
  },

  updateTask: async (token, taskId, taskData) => {
    return fetch(`${API_BASE}/admin/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(taskData)
    }).then(handleResponse);
  },

  deleteTask: async (token, taskId) => {
    return fetch(`${API_BASE}/admin/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(handleResponse);
  },

  assignManualTask: async (token, studentId, taskId) => {
    return fetch(`${API_BASE}/admin/student/assign_manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ student_id: studentId, task_id: taskId || null })
    }).then(handleResponse);
  },

  submitSolution: async (userId, taskId, code) => {
    return fetch(`${API_BASE}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        submission: {
          task_id: taskId,
          code: code
        }
      }),
    }).then(handleResponse);
  },

  // --- Admin ---
  getStudents: async (token) => {
    return fetch(`${API_BASE}/admin/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(handleResponse);
  },

  getStudentDetail: async (token, studentId) => {
    return fetch(`${API_BASE}/admin/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(handleResponse);
  },

  assignTasks: async (token) => {
    return fetch(`${API_BASE}/admin/tasks/assign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(handleResponse);
  }
};