// Balance and Khata Book Manager - Fixed Version

class BalanceKhataManager {
  // Update deposit/withdraw to properly update user balance
  static async processTransaction(userType, userId, amount, transactionType) {
    try {
      // Insert into transactions table
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          user_type: userType,
          transaction_type: transactionType,
          amount: amount,
          description: `${transactionType === 'deposit' ? 'Deposit' : 'Withdraw'} by admin`
        });
      
      if (transError) throw transError;
      
      // Insert into ledger table (this will trigger balance update)
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          user_id: userId,
          user_type: userType,
          transaction_type: transactionType,
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          description: `${transactionType === 'deposit' ? 'Deposit' : 'Withdraw'} by admin`
        });
      
      if (ledgerError) throw ledgerError;
      
      return { success: true };
    } catch (error) {
      console.error('Transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user balance from database
  static async getUserBalance(userId, userType) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_balance', {
          p_user_id: userId,
          p_user_type: userType
        });
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Get user khata book entries
  static async getUserKhata(userId, userType) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_khata', {
          p_user_id: userId,
          p_user_type: userType
        });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting khata:', error);
      return [];
    }
  }

  // Display user balance in UI
  static async displayUserBalance(userId, userType, elementId) {
    const balance = await this.getUserBalance(userId, userType);
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = `₹${balance}`;
    }
  }

  // Display khata book entries in UI
  static async displayKhataEntries(userId, userType, containerId) {
    const entries = await this.getUserKhata(userId, userType);
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    let khataHTML = '';
    entries.forEach(entry => {
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
          </div>
        </div>
      `;
    });
    
    container.innerHTML = khataHTML || '<div class="list-item">No entries found</div>';
  }
}

// Update existing TransactionManager to use new balance system
if (window.TransactionManager) {
  // Override the transact method
  const originalTransact = TransactionManager.transact;
  TransactionManager.transact = async function(type) {
    const panel = document.getElementById('transactionPanel').value;
    const username = document.getElementById('transUser').value.trim();
    const amount = parseFloat(document.getElementById('transAmt').value);
    
    if (!panel || !username || !amount || amount <= 0) {
      showMessage('transMsg', 'Please fill all fields with valid values', 'error');
      return;
    }
    
    try {
      // Find user in database
      let user = null;
      
      if (panel === 'superMaster') {
        const { data } = await supabase.from('supermasters').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
      } else if (panel === 'master') {
        const { data } = await supabase.from('masters').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
      } else if (panel === 'agent') {
        const { data } = await supabase.from('agents').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
      }
      
      if (!user) {
        showMessage('transMsg', 'User not found', 'error');
        return;
      }
      
      // Process transaction with balance update
      const result = await BalanceKhataManager.processTransaction(panel, user.id, amount, type);
      
      if (result.success) {
        showMessage('transMsg', `Successfully ${type === 'deposit' ? 'deposited' : 'withdrew'} ₹${amount} for ${username}`, 'success');
        
        // Clear form
        document.getElementById('transUser').value = '';
        document.getElementById('transAmt').value = '';
      } else {
        showMessage('transMsg', result.error || 'Transaction failed', 'error');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      showMessage('transMsg', 'Transaction failed. Please try again.', 'error');
    }
  };
}

// Update KhataBookManager to show entries properly
if (window.KhataBookManager) {
  // Override renderKhataBook method
  KhataBookManager.renderKhataBook = async function() {
    const userSelect = document.getElementById('khataUser');
    const userId = userSelect.value;
    const panel = document.getElementById('khataPanel').value;
    
    if (!userId || !panel) {
      document.getElementById('khataList').innerHTML = '<div class="list-item">Select a user to view notes</div>';
      return;
    }
    
    await BalanceKhataManager.displayKhataEntries(parseInt(userId), panel, 'khataList');
  };
}

window.BalanceKhataManager = BalanceKhataManager;