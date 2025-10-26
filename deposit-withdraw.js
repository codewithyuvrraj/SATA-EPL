// Deposit and Withdraw Management Functions

class TransactionManager {
  // Populate users dropdown based on selected panel
  static async populateTransactionUsers() {
    const panel = document.getElementById('transactionPanel').value;
    const userInput = document.getElementById('transUser');
    
    if (!panel) {
      userInput.value = '';
      return;
    }
    
    // Store available users for validation
    try {
      let users = [];
      
      if (panel === 'superMaster') {
        users = await DatabaseManager.getAllSupermasters();
      } else if (panel === 'master') {
        const { data } = await supabase.from('masters').select('*').eq('blocked', false);
        users = data || [];
      } else if (panel === 'agent') {
        const { data } = await supabase.from('agents').select('*').eq('blocked', false);
        users = data || [];
      }
      
      // Store users for validation
      window.availableUsers = users;
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Process deposit transaction
  static async deposit() {
    await TransactionManager.transact('deposit');
  }

  // Process withdraw transaction
  static async withdraw() {
    await TransactionManager.transact('withdraw');
  }

  // Main transaction function
  static async transact(type) {
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
      let tableName = '';
      
      if (panel === 'superMaster') {
        const { data } = await supabase.from('supermasters').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
        tableName = 'supermasters';
      } else if (panel === 'master') {
        const { data } = await supabase.from('masters').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
        tableName = 'masters';
      } else if (panel === 'agent') {
        const { data } = await supabase.from('agents').select('*').eq('username', username).eq('blocked', false).single();
        user = data;
        tableName = 'agents';
      }
      
      if (!user) {
        showMessage('transMsg', 'User not found', 'error');
        return;
      }
      
      // Record transaction in transactions table
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          user_type: panel,
          transaction_type: type,
          amount: amount,
          description: `${type === 'deposit' ? 'Deposit' : 'Withdraw'} by admin`
        });
      
      if (transError) throw transError;
      
      // Record in ledger table
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          user_id: user.id,
          user_type: panel,
          transaction_type: type,
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          description: `${type === 'deposit' ? 'Deposit' : 'Withdraw'} by admin`
        });
      
      if (ledgerError) throw ledgerError;
      
      showMessage('transMsg', `Successfully ${type === 'deposit' ? 'deposited' : 'withdrew'} ₹${amount} for ${username}`, 'success');
      
      // Clear form
      document.getElementById('transUser').value = '';
      document.getElementById('transAmt').value = '';
    } catch (error) {
      console.error('Transaction error:', error);
      showMessage('transMsg', 'Transaction failed. Please try again.', 'error');
    }
  }
}

// Export for global use
window.TransactionManager = TransactionManager;
