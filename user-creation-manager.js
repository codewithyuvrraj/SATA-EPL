// User Creation and Hierarchy Manager

class UserCreationManager {
  // Admin create user function - can create any user type
  static async adminCreateUser(userType, username, loginName, password, winCommission, lossCommission, parentId = null) {
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_user_type: userType,
        p_username: username,
        p_login_name: loginName,
        p_password: password,
        p_parent_id: parentId,
        p_win_commission: winCommission || 0,
        p_loss_commission: lossCommission || 0,
        p_initial_balance: 0
      });
      
      if (error) throw error;
      
      const result = data[0];
      return {
        success: result.success,
        userId: result.user_id,
        message: result.message
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Get available parent users for dropdown
  static async getAvailableParents(userType) {
    try {
      const { data, error } = await supabase.rpc('get_available_parents', {
        p_user_type: userType
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting available parents:', error);
      return [];
    }
  }

  // Get user's subordinates
  static async getUserSubordinates(userId, userType) {
    try {
      const { data, error } = await supabase.rpc('get_user_subordinates', {
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

  // Enhanced user creation for admin panel
  static async enhancedCreateUser() {
    const userType = document.getElementById('userType').value;
    const username = document.getElementById('newUser').value.trim();
    const loginName = document.getElementById('newLoginName').value.trim();
    const password = document.getElementById('newPass').value;
    const winCommission = parseFloat(document.getElementById('winCommission').value) || 0;
    const lossCommission = parseFloat(document.getElementById('lossCommission').value) || 0;
    
    if (!username || !loginName || !password) {
      showMessage('userMsg', 'Please fill all required fields', 'error');
      return;
    }
    
    // Get parent ID if needed
    let parentId = null;
    const parentSelect = document.getElementById('parentUser');
    if (parentSelect && parentSelect.value) {
      parentId = parseInt(parentSelect.value);
    }
    
    const result = await this.adminCreateUser(userType, username, loginName, password, winCommission, lossCommission, parentId);
    
    if (result.success) {
      showMessage('userMsg', result.message, 'success');
      
      // Clear form
      document.getElementById('newUser').value = '';
      document.getElementById('newLoginName').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('winCommission').value = '';
      document.getElementById('lossCommission').value = '';
      if (parentSelect) parentSelect.value = '';
      
      // Refresh dashboard
      if (typeof refreshDashboard === 'function') {
        await refreshDashboard();
      }
    } else {
      showMessage('userMsg', result.message, 'error');
    }
  }

  // Populate parent users dropdown
  static async populateParentUsers(userType) {
    const parentSelect = document.getElementById('parentUser');
    if (!parentSelect) return;
    
    parentSelect.innerHTML = '<option value="">Select Parent (Optional)</option>';
    
    if (userType === 'superMaster') {
      parentSelect.style.display = 'none';
      return;
    }
    
    parentSelect.style.display = 'block';
    
    const parents = await this.getAvailableParents(userType);
    parents.forEach(parent => {
      const option = document.createElement('option');
      option.value = parent.id;
      option.textContent = `${parent.username} (${parent.login_name})`;
      parentSelect.appendChild(option);
    });
  }

  // Enhanced render subordinates for user panels
  static async renderSubordinates(userType, userId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const subordinates = await this.getUserSubordinates(userId, userType);
    
    let html = '';
    subordinates.forEach(user => {
      const statusBadge = user.blocked ? 'badge-danger' : 'badge-success';
      const statusText = user.blocked ? 'Blocked' : 'Active';
      
      html += `
        <div class="list-item">
          <div class="list-item-header">
            <div class="list-item-title">
              <span class="user-type-indicator ${this.getUserTypeIndicator(user.user_type)}">${this.getUserTypeAbbr(user.user_type)}</span>
              ${user.username}
            </div>
            <div class="badge ${statusBadge}">${statusText}</div>
          </div>
          <div class="list-item-details">
            <div class="list-item-detail"><i class="fas fa-key"></i> Login: ${user.login_name}</div>
            <div class="list-item-detail"><i class="fas fa-money-bill-wave"></i> Balance: ₹${user.balance || 0}</div>
            <div class="list-item-detail"><i class="fas fa-calendar"></i> Created: ${new Date(user.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html || '<div class="list-item">No subordinates found</div>';
  }

  // Helper functions
  static getUserTypeIndicator(userType) {
    const indicators = {
      'superMaster': 'super-master-indicator',
      'master': 'master-indicator',
      'agent': 'agent-indicator',
      'client': 'client-indicator'
    };
    return indicators[userType] || 'admin-indicator';
  }

  static getUserTypeAbbr(userType) {
    const abbrs = {
      'superMaster': 'SM',
      'master': 'M',
      'agent': 'A',
      'client': 'C'
    };
    return abbrs[userType] || 'U';
  }
}

// Override existing create user functions
if (typeof createUser === 'function') {
  createUser = UserCreationManager.enhancedCreateUser;
}

// Add event listener for user type change
document.addEventListener('DOMContentLoaded', () => {
  const userTypeSelect = document.getElementById('userType');
  if (userTypeSelect) {
    userTypeSelect.addEventListener('change', (e) => {
      UserCreationManager.populateParentUsers(e.target.value);
    });
  }
});

window.UserCreationManager = UserCreationManager;