// Complete System Manager - All Issues Fixed

class CompleteSystemManager {
  // Fix admin dashboard to show correct user counts
  static async refreshAdminDashboard() {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      
      const stats = data[0];
      document.getElementById('totalSuperMasters').textContent = stats.total_supermasters || 0;
      document.getElementById('totalMasters').textContent = stats.total_masters || 0;
      document.getElementById('totalAgents').textContent = stats.total_agents || 0;
      document.getElementById('totalClients').textContent = stats.total_clients || 0;
      
      showToast('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Fix user panel dashboards with hierarchy counts
  static async refreshUserDashboard(userType, username) {
    try {
      // Get user data with balance
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_with_balance', {
          p_username: username,
          p_user_type: userType
        });
      
      if (userError) throw userError;
      if (!userData || userData.length === 0) throw new Error('User not found');
      
      const user = userData[0];
      
      // Get hierarchy counts
      const { data: countsData, error: countsError } = await supabase
        .rpc('get_user_hierarchy_counts', {
          p_user_id: user.id,
          p_user_type: userType
        });
      
      if (countsError) throw countsError;
      const counts = countsData[0] || { masters_count: 0, agents_count: 0, clients_count: 0 };
      
      // Update dashboard based on user type
      if (userType === 'superMaster') {
        document.getElementById('smTotalMasters').textContent = counts.masters_count;
        document.getElementById('smTotalAgents').textContent = counts.agents_count;
        document.getElementById('smTotalClients').textContent = counts.clients_count;
        document.getElementById('smTotalBalance').textContent = `₹${user.balance || 0}`;
        document.getElementById('smWinCommission').textContent = `${user.win_commission}%`;
        document.getElementById('smLossCommission').textContent = `${user.loss_commission}%`;
        document.getElementById('smTotalCommission').textContent = `₹${user.total_commission || 0}`;
      } else if (userType === 'master') {
        document.getElementById('mTotalAgents').textContent = counts.agents_count;
        document.getElementById('mTotalClients').textContent = counts.clients_count;
        document.getElementById('mTotalBalance').textContent = `₹${user.balance || 0}`;
        document.getElementById('mWinCommission').textContent = `${user.win_commission}%`;
        document.getElementById('mLossCommission').textContent = `${user.loss_commission}%`;
        document.getElementById('mTotalCommission').textContent = `₹${user.total_commission || 0}`;
      } else if (userType === 'agent') {
        document.getElementById('aTotalClients').textContent = counts.clients_count;
        document.getElementById('aActiveClients').textContent = counts.clients_count; // Simplified
        document.getElementById('aTotalBalance').textContent = `₹${user.balance || 0}`;
        document.getElementById('aWinCommission').textContent = `${user.win_commission}%`;
        document.getElementById('aLossCommission').textContent = `${user.loss_commission}%`;
        document.getElementById('aTotalCommission').textContent = `₹${user.total_commission || 0}`;
      }
      
      showToast(`${userType} dashboard refreshed`);
    } catch (error) {
      console.error('Error refreshing user dashboard:', error);
      showToast('Failed to refresh dashboard', true);
    }
  }

  // Fix khata book to show admin notes
  static async showUserKhataBook(userType, username) {
    try {
      // Get user ID first
      const { data: userData } = await supabase
        .rpc('get_user_with_balance', {
          p_username: username,
          p_user_type: userType
        });
      
      if (!userData || userData.length === 0) {
        alert('User not found');
        return;
      }
      
      const user = userData[0];
      
      // Get khata book entries
      const { data: khataData, error } = await supabase
        .rpc('get_user_khata_book', {
          p_user_id: user.id,
          p_user_type: userType
        });
      
      if (error) throw error;
      
      // Display in modal
      let khataHTML = '';
      (khataData || []).forEach(entry => {
        const typeIcon = entry.transaction_type === 'deposit' ? 'plus-circle' : 
                        entry.transaction_type === 'withdraw' ? 'minus-circle' : 'sticky-note';
        const typeColor = entry.transaction_type === 'deposit' ? 'success' : 
                         entry.transaction_type === 'withdraw' ? 'danger' : 'info';
        const typeLabel = entry.transaction_type === 'deposit' ? 'Deposit' : 
                         entry.transaction_type === 'withdraw' ? 'Withdraw' : 'Note';
        
        khataHTML += `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-title">
                <i class="fas fa-${typeIcon}"></i> ${typeLabel}
              </div>
              <div class="badge badge-${typeColor}">${entry.date}</div>
            </div>
            <div class="list-item-details">
              ${entry.amount > 0 ? `<div class="list-item-detail"><i class="fas fa-money-bill-wave"></i> Amount: ₹${entry.amount}</div>` : ''}
              <div class="list-item-detail">${entry.description || 'No description'}</div>
              <div class="list-item-detail"><i class="fas fa-user"></i> By: ${entry.created_by}</div>
              <div class="list-item-detail"><i class="fas fa-clock"></i> ${new Date(entry.created_at).toLocaleString()}</div>
            </div>
          </div>
        `;
      });
      
      const modalContent = document.getElementById('khataBookModalContent');
      if (modalContent) {
        modalContent.innerHTML = khataHTML || '<div class="list-item">No entries found</div>';
        document.getElementById('khataBookModal').style.display = 'flex';
      }
    } catch (error) {
      console.error('Error showing khata book:', error);
      alert('Failed to load khata book');
    }
  }

  // Fix admin khata book rendering
  static async renderAdminKhataBook() {
    const userSelect = document.getElementById('khataUser');
    const userId = userSelect.value;
    const panel = document.getElementById('khataPanel').value;
    
    if (!userId || !panel) {
      document.getElementById('khataList').innerHTML = '<div class="list-item">Select a user to view notes</div>';
      return;
    }
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_khata_book', {
          p_user_id: parseInt(userId),
          p_user_type: panel
        });
      
      if (error) throw error;
      
      let khataHTML = '';
      (data || []).forEach(entry => {
        const typeIcon = entry.transaction_type === 'deposit' ? 'plus-circle' : 
                        entry.transaction_type === 'withdraw' ? 'minus-circle' : 'sticky-note';
        const typeColor = entry.transaction_type === 'deposit' ? 'success' : 
                         entry.transaction_type === 'withdraw' ? 'danger' : 'info';
        const typeLabel = entry.transaction_type === 'deposit' ? 'Deposit' : 
                         entry.transaction_type === 'withdraw' ? 'Withdraw' : 'Note';
        
        khataHTML += `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-title">
                <i class="fas fa-${typeIcon}"></i> ${typeLabel}
              </div>
              <div class="badge badge-${typeColor}">${entry.date}</div>
            </div>
            <div class="list-item-details">
              ${entry.amount > 0 ? `<div class="list-item-detail"><i class="fas fa-money-bill-wave"></i> Amount: ₹${entry.amount}</div>` : ''}
              <div class="list-item-detail">${entry.description || 'No description'}</div>
              <div class="list-item-detail"><i class="fas fa-user"></i> By: ${entry.created_by}</div>
            </div>
          </div>
        `;
      });
      
      document.getElementById('khataList').innerHTML = khataHTML || '<div class="list-item">No entries found</div>';
    } catch (error) {
      console.error('Error loading khata book:', error);
      document.getElementById('khataList').innerHTML = '<div class="list-item">Error loading entries</div>';
    }
  }
}

// Override existing functions
if (typeof refreshDashboard === 'function') {
  refreshDashboard = CompleteSystemManager.refreshAdminDashboard;
}

if (typeof renderSuperMasterInfo === 'function') {
  const originalRenderSuperMasterInfo = renderSuperMasterInfo;
  renderSuperMasterInfo = async function() {
    await CompleteSystemManager.refreshUserDashboard('superMaster', currentUser);
  };
}

if (typeof renderMasterInfo === 'function') {
  const originalRenderMasterInfo = renderMasterInfo;
  renderMasterInfo = async function() {
    await CompleteSystemManager.refreshUserDashboard('master', currentUser);
  };
}

if (typeof renderAgentInfo === 'function') {{
  const originalRenderAgentInfo = renderAgentInfo;
  renderAgentInfo = async function() {
    await CompleteSystemManager.refreshUserDashboard('agent', currentUser);
  };
}

if (typeof viewKhataBook === 'function') {
  viewKhataBook = function() {
    CompleteSystemManager.showUserKhataBook(currentUserType, currentUser);
  };
}

if (window.KhataBookManager && KhataBookManager.renderKhataBook) {
  KhataBookManager.renderKhataBook = CompleteSystemManager.renderAdminKhataBook;
}

window.CompleteSystemManager = CompleteSystemManager;