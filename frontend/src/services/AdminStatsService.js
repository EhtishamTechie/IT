import API from '../api';

class AdminStatsService {
  async getDashboardStats() {
    try {
      const response = await API.get('/admin/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
}

export default new AdminStatsService();
