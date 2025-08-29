import { getApiUrl } from '../config';

class AdminManagementService {
  constructor() {
    this.baseURL = getApiUrl('/admin/management');
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all admin users
  async getAllAdmins() {
    try {
      const response = await fetch(this.baseURL, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch admin users');
      }

      return data;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      throw error;
    }
  }

  // Create new admin user
  async createAdmin(adminData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(adminData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create admin user');
      }

      return data;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  // Update admin user
  async updateAdmin(id, adminData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(adminData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update admin user');
      }

      return data;
    } catch (error) {
      console.error('Error updating admin user:', error);
      throw error;
    }
  }

  // Reset admin password
  async resetAdminPassword(id, newPassword) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/reset-password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset admin password');
      }

      return data;
    } catch (error) {
      console.error('Error resetting admin password:', error);
      throw error;
    }
  }

  // Delete admin user
  async deleteAdmin(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete admin user');
      }

      return data;
    } catch (error) {
      console.error('Error deleting admin user:', error);
      throw error;
    }
  }
}

export default new AdminManagementService();
