// Submit Data Management Functions

class SubmitDataManager {
  // Populate users dropdown based on selected panel
  static async populateSubmitUsers() {
    const panel = document.getElementById('submitPanel').value;
    const userSelect = document.getElementById('submitUser');
    userSelect.innerHTML = '<option value="">Select User</option>';
    
    if (!panel) return;
    
    try {
      let users = [];
      
      if (panel === 'superMaster') {
        const { data, error } = await supabase.from('supermasters').select('*').eq('blocked', false);
        if (error) throw error;
        users = data || [];
      } else if (panel === 'master') {
        const { data, error } = await supabase.from('masters').select('*').eq('blocked', false);
        if (error) throw error;
        users = data || [];
      } else if (panel === 'agent') {
        const { data, error } = await supabase.from('agents').select('*').eq('blocked', false);
        if (error) throw error;
        users = data || [];
      }
      
      console.log('Loaded users:', users);
      
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.dataset.username = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading users:', error);
      showMessage('submitMsg', 'Failed to load users', 'error');
    }
  }

  // Submit transaction
  static async submitTransaction() {
    const panel = document.getElementById('submitPanel').value;
    const userSelect = document.getElementById('submitUser');
    const userId = userSelect.value;
    const username = userSelect.options[userSelect.selectedIndex]?.dataset.username;
    const amount = parseFloat(document.getElementById('submitAmount').value);
    const type = document.getElementById('submitType').value;
    const date = document.getElementById('submitDate').value;
    
    if (!panel || !userId || !amount || amount <= 0 || !date) {
      showMessage('submitMsg', 'Please fill all fields correctly', 'error');
      return;
    }
    
    try {
      // Insert into transactions table
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: parseInt(userId),
          user_type: panel,
          transaction_type: type,
          amount: amount,
          description: `${type === 'deposit' ? 'Lena' : 'Dena'} - Submitted on ${date}`
        });
      
      if (transError) throw transError;
      
      // Insert into ledger table
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          user_id: parseInt(userId),
          user_type: panel,
          transaction_type: type,
          amount: amount,
          date: date,
          description: `${type === 'deposit' ? 'Lena' : 'Dena'} - Submitted by admin`
        });
      
      if (ledgerError) throw ledgerError;
      
      showMessage('submitMsg', `Transaction submitted successfully for ${username}`, 'success');
      
      // Clear form
      document.getElementById('submitAmount').value = '';
    } catch (error) {
      console.error('Submit error:', error);
      showMessage('submitMsg', 'Failed to submit transaction', 'error');
    }
  }

  // Render submitted data
  static async renderSubmittedData() {
    const date = document.getElementById('dataDate').value;
    
    try {
      let query = supabase
        .from('ledger')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      let dataHTML = '';
      (data || []).forEach((entry, index) => {
        const typeIcon = entry.transaction_type === 'deposit' ? 'plus-circle' : 'minus-circle';
        const typeColor = entry.transaction_type === 'deposit' ? 'success' : 'danger';
        const typeLabel = entry.transaction_type === 'deposit' ? 'Lena' : 'Dena';
        
        dataHTML += `
          <div class="list-item" data-id="${entry.id}">
            <div class="list-item-header">
              <div class="list-item-title">
                <i class="fas fa-${typeIcon}"></i> User ID: ${entry.user_id}
                <input type="checkbox" class="data-checkbox" data-id="${entry.id}">
              </div>
              <div class="badge badge-${typeColor}">${typeLabel}</div>
            </div>
            <div class="list-item-details">
              <div class="list-item-detail"><i class="fas fa-calendar"></i> ${entry.date}</div>
              <div class="list-item-detail"><i class="fas fa-money-bill-wave"></i> Amount: ₹${entry.amount}</div>
              <div class="list-item-detail"><i class="fas fa-user-tag"></i> Panel: ${entry.user_type}</div>
              ${entry.description ? `<div class="list-item-detail"><i class="fas fa-info-circle"></i> ${entry.description}</div>` : ''}
            </div>
          </div>
        `;
      });
      
      document.getElementById('submittedDataList').innerHTML = dataHTML || '<div class="list-item">No submitted data found</div>';
    } catch (error) {
      console.error('Error loading submitted data:', error);
      document.getElementById('submittedDataList').innerHTML = '<div class="list-item">Error loading data</div>';
    }
  }

  // Delete selected data entries
  static async deleteSelectedData() {
    const checkboxes = document.querySelectorAll('.data-checkbox:checked');
    if (checkboxes.length === 0) {
      alert('Please select at least one data entry to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${checkboxes.length} data entries? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
      
      const { error } = await supabase
        .from('ledger')
        .delete()
        .in('id', idsToDelete);
      
      if (error) throw error;
      
      showMessage('submitMsg', `${idsToDelete.length} data entries deleted successfully`, 'success');
      await SubmitDataManager.renderSubmittedData();
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('submitMsg', 'Failed to delete entries', 'error');
    }
  }
}

// Export for global use
window.SubmitDataManager = SubmitDataManager;
