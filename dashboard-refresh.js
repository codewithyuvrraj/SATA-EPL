// Dashboard Refresh Manager - Fetch updated data from database

class DashboardRefresh {
  // Refresh Admin Dashboard
  static async refreshAdminDashboard() {
    try {
      const stats = await DatabaseManager.getDashboardStats();
      document.getElementById('totalSuperMasters').textContent = stats.superMasters;
      document.getElementById('totalMasters').textContent = stats.masters;
      document.getElementById('totalAgents').textContent = stats.agents;
      document.getElementById('totalClients').textContent = stats.clients;
      
      showToast('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing admin dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Refresh Super Master Dashboard
  static async refreshSuperMasterDashboard() {
    try {
      const { data: user } = await supabase
        .from('supermasters')
        .select('*')
        .eq('username', currentUser)
        .single();
      
      if (!user) throw new Error('User not found');
      
      // Get counts of subordinates
      const { data: masters } = await supabase
        .from('masters')
        .select('id')
        .eq('supermaster_id', user.id)
        .eq('blocked', false);
      
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .eq('blocked', false);
      
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('blocked', false);
      
      // Update dashboard
      document.getElementById('smTotalMasters').textContent = masters?.length || 0;
      document.getElementById('smTotalAgents').textContent = agents?.length || 0;
      document.getElementById('smTotalClients').textContent = clients?.length || 0;
      document.getElementById('smTotalBalance').textContent = `₹${user.balance || 0}`;
      document.getElementById('smWinCommission').textContent = `${user.win_commission}%`;
      document.getElementById('smLossCommission').textContent = `${user.loss_commission}%`;
      document.getElementById('smTotalCommission').textContent = `₹${user.total_commission || 0}`;
      
      showToast('Super Master dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing super master dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Refresh Master Dashboard
  static async refreshMasterDashboard() {
    try {
      const { data: user } = await supabase
        .from('masters')
        .select('*')
        .eq('username', currentUser)
        .single();
      
      if (!user) throw new Error('User not found');
      
      // Get counts of subordinates
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .eq('master_id', user.id)
        .eq('blocked', false);
      
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('blocked', false);
      
      // Update dashboard
      document.getElementById('mTotalAgents').textContent = agents?.length || 0;
      document.getElementById('mTotalClients').textContent = clients?.length || 0;
      document.getElementById('mTotalBalance').textContent = `₹${user.balance || 0}`;
      document.getElementById('mWinCommission').textContent = `${user.win_commission}%`;
      document.getElementById('mLossCommission').textContent = `${user.loss_commission}%`;
      document.getElementById('mTotalCommission').textContent = `₹${user.total_commission || 0}`;
      
      showToast('Master dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing master dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Refresh Agent Dashboard
  static async refreshAgentDashboard() {
    try {
      const { data: user } = await supabase
        .from('agents')
        .select('*')
        .eq('username', currentUser)
        .single();
      
      if (!user) throw new Error('User not found');
      
      // Get counts of subordinates
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', user.id)
        .eq('blocked', false);
      
      const activeClients = clients?.filter(c => (c.balance || 0) > 0) || [];
      
      // Update dashboard
      document.getElementById('aTotalClients').textContent = clients?.length || 0;
      document.getElementById('aActiveClients').textContent = activeClients.length;
      document.getElementById('aTotalBalance').textContent = `₹${user.balance || 0}`;
      document.getElementById('aWinCommission').textContent = `${user.win_commission}%`;
      document.getElementById('aLossCommission').textContent = `${user.loss_commission}%`;
      document.getElementById('aTotalCommission').textContent = `₹${user.total_commission || 0}`;
      
      showToast('Agent dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing agent dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Refresh Client Dashboard
  static async refreshClientDashboard() {
    try {
      const { data: user } = await supabase
        .from('clients')
        .select('*')
        .eq('username', currentUser)
        .single();
      
      if (!user) throw new Error('User not found');
      
      // Update balance
      document.getElementById('clientCoins').textContent = user.balance || 0;
      
      // Update last login
      if (user.last_login) {
        document.getElementById('lastLogin').textContent = new Date(user.last_login).toLocaleString();
      }
      
      showToast('Client dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing client dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Universal refresh function
  static async refreshCurrentDashboard() {
    if (currentUserType === 'admin') {
      await this.refreshAdminDashboard();
    } else if (currentUserType === 'superMaster') {
      await this.refreshSuperMasterDashboard();
    } else if (currentUserType === 'master') {
      await this.refreshMasterDashboard();
    } else if (currentUserType === 'agent') {
      await this.refreshAgentDashboard();
    } else if (currentUserType === 'client') {
      await this.refreshClientDashboard();
    }
  }
}

// Override existing refresh functions
if (typeof refreshDashboard === 'function') {
  refreshDashboard = DashboardRefresh.refreshAdminDashboard;
}

window.DashboardRefresh = DashboardRefresh;