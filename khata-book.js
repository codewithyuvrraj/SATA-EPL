// Khata Book Management Functions

class KhataBookManager {
  // Populate users dropdown based on selected panel
  static async populateKhataUsers() {
    const panel = document.getElementById('khataPanel').value;
    const userSelect = document.getElementById('khataUser');
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
      
      console.log('Loaded khata users:', users);
      
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.dataset.username = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Add note to khata book
  static async addKhataNote() {
    const panel = document.getElementById('khataPanel').value;
    const userSelect = document.getElementById('khataUser');
    const userId = userSelect.value;
    const username = userSelect.options[userSelect.selectedIndex]?.dataset.username;
    const note = document.getElementById('khataNote').value.trim();
    
    if (!panel || !userId || !note) {
      showMessage('khataMsg', 'Please select panel, user and enter a note', 'error');
      return;
    }
    
    try {
      // Insert into ledger table
      const { data, error } = await supabase
        .from('ledger')
        .insert({
          user_id: parseInt(userId),
          user_type: panel,
          transaction_type: 'note',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          description: note
        })
        .select();
      
      if (error) throw error;
      
      showMessage('khataMsg', 'Note added successfully', 'success');
      document.getElementById('khataNote').value = '';
      await KhataBookManager.renderKhataBook();
    } catch (error) {
      console.error('Error adding note:', error);
      showMessage('khataMsg', 'Failed to add note', 'error');
    }
  }

  // Render khata book entries
  static async renderKhataBook() {
    const userSelect = document.getElementById('khataUser');
    const userId = userSelect.value;
    
    if (!userId) {
      document.getElementById('khataList').innerHTML = '<div class="list-item">Select a user to view notes</div>';
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('user_id', parseInt(userId))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let khataHTML = '';
      (data || []).forEach(entry => {
        const typeIcon = entry.transaction_type === 'deposit' ? 'plus-circle' : 
                        entry.transaction_type === 'withdraw' ? 'minus-circle' : 'sticky-note';
        const typeColor = entry.transaction_type === 'deposit' ? 'success' : 
                         entry.transaction_type === 'withdraw' ? 'danger' : 'info';
        
        khataHTML += `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-title">
                <i class="fas fa-${typeIcon}"></i> ${entry.transaction_type.toUpperCase()}
              </div>
              <div class="badge badge-${typeColor}">${entry.date}</div>
            </div>
            <div class="list-item-details">
              <div class="list-item-detail">
                ${entry.transaction_type === 'note' ? entry.description : `Amount: ₹${entry.amount} - ${entry.description || ''}`}
              </div>
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

// Export for global use
window.KhataBookManager = KhataBookManager;
