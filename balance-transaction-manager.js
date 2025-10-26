// Balance Transaction Manager - Fix deposit/withdraw balance updates
class BalanceTransactionManager {
  
  // Admin deposit function with proper balance update
  static async adminDeposit(panel, username, amount) {
    try {
      if (!panel || !username || !amount || amount <= 0) {
        throw new Error('Invalid input parameters');
      }
      
      const { data, error } = await supabase.rpc('admin_update_user_balance', {
        p_username: username,
        p_panel: panel,
        p_amount: amount,
        p_transaction_type: 'deposit'
      });
      
      if (error) throw error;
      
      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return {
        success: true,
        message: result.message,
        newBalance: result.new_balance
      };
    } catch (error) {
      console.error('Deposit error:', error);
      return {
        success: false,
        message: error.message || 'Deposit failed'
      };
    }
  }
  
  // Admin withdraw function with proper balance update
  static async adminWithdraw(panel, username, amount) {
    try {
      if (!panel || !username || !amount || amount <= 0) {
        throw new Error('Invalid input parameters');
      }
      
      const { data, error } = await supabase.rpc('admin_update_user_balance', {
        p_username: username,
        p_panel: panel,
        p_amount: amount,
        p_transaction_type: 'withdraw'
      });
      
      if (error) throw error;
      
      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return {
        success: true,
        message: result.message,
        newBalance: result.new_balance
      };
    } catch (error) {
      console.error('Withdraw error:', error);
      return {
        success: false,
        message: error.message || 'Withdrawal failed'
      };
    }
  }
  
  // Get user balance from specific panel
  static async getUserBalance(username, panel) {
    try {
      const { data, error } = await supabase.rpc('get_user_balance', {
        p_username: username,
        p_panel: panel
      });
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }
  
  // Validate if user exists in panel
  static async validateUserInPanel(username, panel) {
    try {
      const { data, error } = await supabase.rpc('validate_user_in_panel', {
        p_username: username,
        p_panel: panel
      });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  }
  
  // Get all users from a panel with their balances
  static async getPanelUsersWithBalance(panel) {
    try {
      const { data, error } = await supabase.rpc('get_panel_users_with_balance', {
        p_panel: panel
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting panel users:', error);
      return [];
    }
  }
  
  // Populate users dropdown for deposit/withdraw
  static async populateTransactionUsers(panel, selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement || !panel) return;
    
    try {
      const users = await this.getPanelUsersWithBalance(panel);
      
      selectElement.innerHTML = '<option value="">Select User</option>';
      
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = `${user.username} (₹${user.balance || 0})`;
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Error populating users:', error);
      selectElement.innerHTML = '<option value="">Error loading users</option>';
    }
  }
}

// Enhanced TransactionManager with proper balance updates
class TransactionManager {
  static async deposit() {
    const panel = document.getElementById('transactionPanel').value;
    const username = document.getElementById('transUser').value.trim();
    const amount = parseFloat(document.getElementById('transAmt').value);
    
    if (!panel || !username || !amount || amount <= 0) {
      showMessage('transMsg', 'Please fill all fields correctly', 'error');
      return;
    }
    
    try {
      // Validate user exists in panel
      const userExists = await BalanceTransactionManager.validateUserInPanel(username, panel);
      if (!userExists) {
        showMessage('transMsg', 'User not found in selected panel', 'error');
        return;
      }
      
      // Perform deposit
      const result = await BalanceTransactionManager.adminDeposit(panel, username, amount);
      
      if (result.success) {
        showMessage('transMsg', result.message, 'success');
        
        // Clear form
        document.getElementById('transUser').value = '';
        document.getElementById('transAmt').value = '';
        
        // Refresh user dropdown to show updated balance
        await BalanceTransactionManager.populateTransactionUsers(panel, 'transUser');
      } else {
        showMessage('transMsg', result.message, 'error');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      showMessage('transMsg', 'Deposit failed. Please try again.', 'error');
    }
  }
  
  static async withdraw() {
    const panel = document.getElementById('transactionPanel').value;
    const username = document.getElementById('transUser').value.trim();
    const amount = parseFloat(document.getElementById('transAmt').value);
    
    if (!panel || !username || !amount || amount <= 0) {
      showMessage('transMsg', 'Please fill all fields correctly', 'error');
      return;
    }
    
    try {
      // Validate user exists in panel
      const userExists = await BalanceTransactionManager.validateUserInPanel(username, panel);
      if (!userExists) {
        showMessage('transMsg', 'User not found in selected panel', 'error');
        return;
      }
      
      // Perform withdrawal
      const result = await BalanceTransactionManager.adminWithdraw(panel, username, amount);
      
      if (result.success) {
        showMessage('transMsg', result.message, 'success');
        
        // Clear form
        document.getElementById('transUser').value = '';
        document.getElementById('transAmt').value = '';
        
        // Refresh user dropdown to show updated balance
        await BalanceTransactionManager.populateTransactionUsers(panel, 'transUser');
      } else {
        showMessage('transMsg', result.message, 'error');
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      showMessage('transMsg', 'Withdrawal failed. Please try again.', 'error');
    }
  }
}

// Auto-populate users when panel changes
document.addEventListener('DOMContentLoaded', function() {
  const transactionPanel = document.getElementById('transactionPanel');
  if (transactionPanel) {
    transactionPanel.addEventListener('change', function() {
      const panel = this.value;
      if (panel) {
        BalanceTransactionManager.populateTransactionUsers(panel, 'transUser');
      } else {
        document.getElementById('transUser').innerHTML = '<option value="">Select User</option>';
      }
    });
  }
});