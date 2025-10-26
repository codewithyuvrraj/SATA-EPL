// Restricted Hierarchy Manager - Users can only see their subordinates
class RestrictedHierarchyManager {
  
  // Get subordinates based on current user's type and ID
  static async getSubordinates(userId, userType) {
    try {
      const { data, error } = await supabase.rpc('get_user_subordinates_restricted', {
        p_user_id: userId,
        p_user_type: userType
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting subordinates:', error);
      return [];
    }
  }
  
  // Get dashboard stats for current user (only their subordinates)
  static async getDashboardStats(userId, userType) {
    try {
      const { data, error } = await supabase.rpc('get_user_dashboard_stats', {
        p_user_id: userId,
        p_user_type: userType
      });
      
      if (error) throw error;
      return data[0] || { total_subordinates: 0, total_agents: 0, total_clients: 0, total_balance: 0 };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { total_subordinates: 0, total_agents: 0, total_clients: 0, total_balance: 0 };
    }
  }
  
  // Check if current user can view a target user
  static async canViewUser(viewerId, viewerType, targetId, targetType) {
    try {
      const { data, error } = await supabase.rpc('can_user_view_subordinate', {
        p_viewer_id: viewerId,
        p_viewer_type: viewerType,
        p_target_id: targetId,
        p_target_type: targetType
      });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking view permissions:', error);
      return false;
    }
  }
  
  // Get available parents for user creation (restricted by hierarchy)
  static async getAvailableParents(creatorId, creatorType, targetType) {
    try {
      const { data, error } = await supabase.rpc('get_available_parents_restricted', {
        p_creator_id: creatorId,
        p_creator_type: creatorType,
        p_target_type: targetType
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting available parents:', error);
      return [];
    }
  }
  
  // Render subordinates list for current user
  static async renderSubordinatesList(containerId, userId, userType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
      const subordinates = await this.getSubordinates(userId, userType);
      
      if (subordinates.length === 0) {
        container.innerHTML = '<div class="list-item">No subordinates found</div>';
        return;
      }
      
      let html = '';
      subordinates.forEach(user => {
        const userTypeIndicator = this.getUserTypeIndicator(user.user_type);
        const userTypeAbbr = this.getUserTypeAbbr(user.user_type);
        
        html += `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-title">
                <span class="user-type-indicator ${userTypeIndicator}">${userTypeAbbr}</span>
                ${user.username} - ₹${user.balance || 0}
              </div>
              <div class="list-item-actions">
                <button class="btn btn-sm btn-warning" onclick="RestrictedHierarchyManager.blockUser(${user.id}, '${user.user_type}')">Block</button>
                <button class="btn btn-sm btn-danger" onclick="RestrictedHierarchyManager.deleteUser(${user.id}, '${user.user_type}')">Delete</button>
              </div>
            </div>
            <div class="list-item-details">
              <div class="list-item-detail"><i class="fas fa-key"></i> Login: ${user.login_name}</div>
              ${user.win_commission ? `<div class="list-item-detail"><i class="fas fa-percentage"></i> Win: ${user.win_commission}% | Loss: ${user.loss_commission}%</div>` : ''}
              <div class="list-item-detail"><i class="fas fa-calendar"></i> Created: ${new Date(user.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering subordinates:', error);
      container.innerHTML = '<div class="list-item">Error loading subordinates</div>';
    }
  }
  
  // Block a user (only if current user has permission)
  static async blockUser(userId, userType) {
    if (!confirm('Are you sure you want to block this user?')) return;
    
    try {
      // Check if current user can perform this action
      const canView = await this.canViewUser(currentUserId, currentUserType, userId, userType);
      if (!canView && currentUserType !== 'admin') {
        showToast('You do not have permission to block this user', true);
        return;
      }
      
      const tableName = this.getTableName(userType);
      const { error } = await supabase
        .from(tableName)
        .update({ blocked: true })
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast('User blocked successfully');
      
      // Refresh the current list
      this.refreshCurrentList();
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('Failed to block user', true);
    }
  }
  
  // Delete a user (only if current user has permission)
  static async deleteUser(userId, userType) {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone!')) return;
    
    try {
      // Check if current user can perform this action
      const canView = await this.canViewUser(currentUserId, currentUserType, userId, userType);
      if (!canView && currentUserType !== 'admin') {
        showToast('You do not have permission to delete this user', true);
        return;
      }
      
      const tableName = this.getTableName(userType);
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast('User deleted successfully');
      
      // Refresh the current list
      this.refreshCurrentList();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user', true);
    }
  }
  
  // Update dashboard with restricted stats
  static async updateRestrictedDashboard(userId, userType) {
    try {
      const stats = await this.getDashboardStats(userId, userType);
      
      if (userType === 'superMaster') {
        document.getElementById('smTotalMasters').textContent = stats.total_subordinates;
        document.getElementById('smTotalAgents').textContent = stats.total_agents;
        document.getElementById('smTotalClients').textContent = stats.total_clients;
        document.getElementById('smTotalBalance').textContent = `₹${stats.total_balance || 0}`;
      } else if (userType === 'master') {
        document.getElementById('mTotalAgents').textContent = stats.total_subordinates;
        document.getElementById('mTotalClients').textContent = stats.total_clients;
        document.getElementById('mTotalBalance').textContent = `₹${stats.total_balance || 0}`;
      } else if (userType === 'agent') {
        document.getElementById('aTotalClients').textContent = stats.total_subordinates;
        document.getElementById('aActiveClients').textContent = stats.total_subordinates; // Assuming all are active
        document.getElementById('aTotalBalance').textContent = `₹${stats.total_balance || 0}`;
      }
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }
  
  // Populate parent dropdown for user creation (restricted)
  static async populateParentDropdown(creatorId, creatorType, targetType, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    try {
      const parents = await this.getAvailableParents(creatorId, creatorType, targetType);
      
      dropdown.innerHTML = '<option value="">Select Parent</option>';
      
      parents.forEach(parent => {
        const option = document.createElement('option');
        option.value = parent.id;
        option.textContent = `${parent.username} (${parent.login_name})`;
        dropdown.appendChild(option);
      });
      
      // If only one parent available (non-admin users), auto-select it
      if (parents.length === 1 && creatorType !== 'admin') {
        dropdown.value = parents[0].id;
      }
    } catch (error) {
      console.error('Error populating parent dropdown:', error);
    }
  }
  
  // Helper methods
  static getTableName(userType) {
    switch(userType) {
      case 'superMaster': return 'supermasters';
      case 'master': return 'masters';
      case 'agent': return 'agents';
      case 'client': return 'clients';
      default: return '';
    }
  }
  
  static getUserTypeIndicator(userType) {
    switch(userType) {
      case 'superMaster': return 'super-master-indicator';
      case 'master': return 'master-indicator';
      case 'agent': return 'agent-indicator';
      case 'client': return 'client-indicator';
      default: return 'admin-indicator';
    }
  }
  
  static getUserTypeAbbr(userType) {
    switch(userType) {
      case 'superMaster': return 'SM';
      case 'master': return 'M';
      case 'agent': return 'A';
      case 'client': return 'C';
      default: return 'A';
    }
  }
  
  // Refresh current subordinates list based on user type
  static refreshCurrentList() {
    if (currentUserType === 'superMaster') {
      this.renderSubordinatesList('mastersList', currentUserId, currentUserType);
    } else if (currentUserType === 'master') {
      this.renderSubordinatesList('agentsList', currentUserId, currentUserType);
    } else if (currentUserType === 'agent') {
      this.renderSubordinatesList('clientsList', currentUserId, currentUserType);
    }
  }
  
  // Initialize restricted hierarchy for current user
  static async initializeRestrictedHierarchy() {
    if (!currentUserId || !currentUserType) return;
    
    try {
      // Update dashboard with restricted stats
      await this.updateRestrictedDashboard(currentUserId, currentUserType);
      
      // Render subordinates list
      if (currentUserType === 'superMaster') {
        await this.renderSubordinatesList('mastersList', currentUserId, currentUserType);
      } else if (currentUserType === 'master') {
        await this.renderSubordinatesList('agentsList', currentUserId, currentUserType);
      } else if (currentUserType === 'agent') {
        await this.renderSubordinatesList('clientsList', currentUserId, currentUserType);
      }
    } catch (error) {
      console.error('Error initializing restricted hierarchy:', error);
    }
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize restricted hierarchy after login
  const originalLogin = window.login;
  window.login = async function() {
    await originalLogin.apply(this, arguments);
    
    // Initialize restricted hierarchy after successful login
    if (currentUserId && currentUserType && currentUserType !== 'admin' && currentUserType !== 'client') {
      setTimeout(() => {
        RestrictedHierarchyManager.initializeRestrictedHierarchy();
      }, 1000);
    }
  };
});