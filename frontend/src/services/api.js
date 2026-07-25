const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Video APIs
export const videoAPI = {
  addVideo: (url) =>
    request('/videos', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  getVideos: () => request('/videos'),

  getVideo: (id) => request(`/videos/${id}`),

  deleteVideo: (id) =>
    request(`/videos/${id}`, { method: 'DELETE' }),

  getSummary: (id) => request(`/videos/${id}/summary`),

  getNotes: (id) => request(`/videos/${id}/notes`),

  getQuiz: (id) => request(`/videos/${id}/quiz`),
};

// Chat APIs
export const chatAPI = {
  askQuestion: (videoId, question) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ videoId, question }),
    }),

  getChatHistory: (videoId) => request(`/chat/${videoId}`),
};

// Auth APIs
export const authAPI = {
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request('/auth/me'),
};

