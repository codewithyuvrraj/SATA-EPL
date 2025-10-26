// Fix Balance Display and Khata Book for User Panels

class PanelBalanceFix {
  // Update balance display for Super Master, Master, Agent panels
  static async updatePanelBalance(userType, username) {
    try {
      let user = null;
      let tableName = '';
      
      if (userType === 'superMaster') {
        const { data } = await supabase.from('supermasters').select('*').eq('username', username).single();
        user = data;
        tableName = 'supermasters';
      } else if (userType === 'master') {
        const { data } = await supabase.from('masters').select('*').eq('username', username).single();
        user = data;
        tableName = 'masters';
      } else if (userType === 'agent') {
        const { data } = await supabase.from('agents').select('*').eq('username', username).single();
        user = data;
        tableName = 'agents';
      }
      
      if (user) {
        // Update balance display in panel
        const balanceElements = document.querySelectorAll(`#${userType.charAt(0)}TotalBalance, #${userType}Balance`);
        balanceElements.forEach(el => {
          if (el) el.textContent = `₹${user.balance || 0}`;
        });
        
        return user;
      }
    } catch (error) {
      console.error('Error updating panel balance:', error);
    }
    return null;
  }

  // Show khata book modal for current user
  static async showUserKhataBook(userType, username) {
    try {
      let user = null;
      
      if (userType === 'superMaster') {
        const { data } = await supabase.from('supermasters').select('*').eq('username', username).single();
        user = data;
      } else if (userType === 'master') {
        const { data } = await supabase.from('masters').select('*').eq('username', username).single();
        user = data;
      } else if (userType === 'agent') {
        const { data } = await supabase.from('agents').select('*').eq('username', username).single();
        user = data;
      }
      
      if (!user) {
        alert('User not found');
        return;
      }
      
      // Get khata entries for this user
      const { data: khataEntries, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_type', userType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Display in modal
      let khataHTML = '';
      (khataEntries || []).forEach(entry => {
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
}

// Override existing panel rendering functions
if (typeof renderSuperMasterInfo === 'function') {
  const originalRenderSuperMasterInfo = renderSuperMasterInfo;
  renderSuperMasterInfo = async function() {
    await originalRenderSuperMasterInfo();
    await PanelBalanceFix.updatePanelBalance('superMaster', currentUser);
  };
}

if (typeof renderMasterInfo === 'function') {
  const originalRenderMasterInfo = renderMasterInfo;
  renderMasterInfo = async function() {
    await originalRenderMasterInfo();
    await PanelBalanceFix.updatePanelBalance('master', currentUser);
  };
}

if (typeof renderAgentInfo === 'function') {
  const originalRenderAgentInfo = renderAgentInfo;
  renderAgentInfo = async function() {
    await originalRenderAgentInfo();
    await PanelBalanceFix.updatePanelBalance('agent', currentUser);
  };
}

// Override viewKhataBook function
if (typeof viewKhataBook === 'function') {
  viewKhataBook = function() {
    PanelBalanceFix.showUserKhataBook(currentUserType, currentUser);
  };
}

window.PanelBalanceFix = PanelBalanceFix;