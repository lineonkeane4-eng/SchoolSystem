// Api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const api = {
  getUsers: async (path, token) => {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('API error');
    return response.json();
  },
  getUser: async (id, token) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch user');
    return response.json();
  },
  createUser: async (path, data, token) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to create user');
    return response.json();
  },
  updateUser: async (id, data, token) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to update user');
    return response.json();
  },
  deleteUser: async (id, token) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete user');
    return response.json();
  },
};

export default api;