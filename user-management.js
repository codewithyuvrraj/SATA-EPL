// User Management Functions for Admin Panel

class UserManagement {
  // Render all users based on selected panel
  static async renderAllUsers() {
    const panel = document.getElementById('usersPanel').value;
    
    if (!panel) {
      document.getElementById('allUsersList').innerHTML = '<div class="list-item">Please select a panel</div>';
      return;
    }
    
    try {
      let users = [];
      let tableName = '';
      
      if (panel === 'superMaster') {
        const { data } = await supabase.from('supermasters').select('*').order('created_at', { ascending: false });
        users = data || [];
        tableName = 'supermasters';
      } else if (panel === 'master') {
        const { data } = await supabase.from('masters').select('*').order('created_at', { ascending: false });
        users = data || [];
        tableName = 'masters';
      } else if (panel === 'agent') {
        const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
        users = data || [];
        tableName = 'agents';
      } else if (panel === 'client') {
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        users = data || [];
        tableName = 'clients';
      }
      
      let usersHTML = '';
      users.forEach(user => {
        const isBlocked = user.blocked;
        const balance = user.balance || 0;
        
        usersHTML += `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-title">
                <span class="user-type-indicator ${UserManagement.getUserTypeIndicator(panel)}">${UserManagement.getUserTypeAbbr(panel)}</span>
                ${user.username}
              </div>
              <div class="list-item-actions">
                <button class="btn btn-sm ${isBlocked ? 'btn-success' : 'btn-warning'}" 
                  onclick="UserManagement.toggleUserBlock('${tableName}', ${user.id}, ${!isBlocked})">
                  ${isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="UserManagement.deleteUser('${tableName}', ${user.id}, '${user.username}')">Delete</button>
              </div>
            </div>
            <div class="list-item-details">
              <div class="list-item-detail"><i class="fas fa-key"></i> Login: ${user.login_name}</div>
              <div class="list-item-detail"><i class="fas fa-lock"></i> Password: ${user.password}</div>
              <div class="list-item-detail"><i class="fas fa-money-bill-wave"></i> Balance: ₹${balance}</div>
              ${user.win_commission ? `<div class="list-item-detail"><i class="fas fa-percentage"></i> Win: ${user.win_commission}% | Loss: ${user.loss_commission}%</div>` : ''}
              <div class="list-item-detail"><i class="fas fa-${isBlocked ? 'ban' : 'check-circle'}"></i> Status: ${isBlocked ? 'Blocked' : 'Active'}</div>
            </div>
          </div>
        `;
      });
      
      document.getElementById('allUsersList').innerHTML = usersHTML || '<div class="list-item">No users found</div>';
    } catch (error) {
      console.error('Error loading users:', error);
      document.getElementById('allUsersList').innerHTML = '<div class="list-item">Error loading users</div>';
    }
  }

  // Toggle user block status
  static async toggleUserBlock(tableName, userId, blocked) {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ blocked: blocked })
        .eq('id', userId);
      
      if (error) throw error;
      
      showMessage('userMsg', `User ${blocked ? 'blocked' : 'unblocked'} successfully`, 'success');
      await UserManagement.renderAllUsers();
    } catch (error) {
      console.error('Error toggling block:', error);
      showMessage('userMsg', 'Failed to update user status', 'error');
    }
  }

  // Delete user
  static async deleteUser(tableName, userId, username) {
    if (!confirm(`Are you sure you want to permanently delete user ${username}? This action cannot be undone!`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      showMessage('userMsg', `User ${username} deleted permanently`, 'success');
      await UserManagement.renderAllUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('userMsg', 'Failed to delete user', 'error');
    }
  }

  // Helper functions
  static getUserTypeIndicator(panel) {
    switch(panel) {
      case 'superMaster': return 'super-master-indicator';
      case 'master': return 'master-indicator';
      case 'agent': return 'agent-indicator';
      case 'client': return 'client-indicator';
      default: return 'admin-indicator';
    }
  }

  static getUserTypeAbbr(panel) {
    switch(panel) {
      case 'superMaster': return 'SM';
      case 'master': return 'M';
      case 'agent': return 'A';
      case 'client': return 'C';
      default: return 'A';
    }
  }
}

// Export for global use
window.UserManagement = UserManagement;
