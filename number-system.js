// Number System Betting Manager

class NumberSystem {
  static bets = {};

  // Show number grid for selected game
  static showNumberGrid(gameType) {
    const maxNumber = gameType === 'harup' ? 10 : 100;
    const numbersPerRow = 4;
    
    let gridHTML = `<h3>${gameType.toUpperCase()}</h3><div class="number-grid">`;
    
    for (let i = 1; i <= maxNumber; i++) {
      const betAmount = NumberSystem.bets[`${gameType}-${i}`] || 0;
      const hasBet = betAmount > 0;
      
      gridHTML += `
        <div class="number-box ${hasBet ? 'has-bet' : ''}" onclick="NumberSystem.openBetModal('${gameType}', ${i})">
          <div class="number">${i}</div>
          ${hasBet ? `<div class="bet-info">₹${betAmount} (${(betAmount * 80).toFixed(0)}X)</div>` : ''}
        </div>
      `;
      
      if (i % numbersPerRow === 0) {
        gridHTML += '<br>';
      }
    }
    
    gridHTML += '</div>';
    document.getElementById('numberGridContainer').innerHTML = gridHTML;
  }

  // Open bet modal
  static openBetModal(gameType, number) {
    document.getElementById('betModalGameType').textContent = gameType.toUpperCase();
    document.getElementById('betModalNumber').textContent = number;
    document.getElementById('betModalGameTypeHidden').value = gameType;
    document.getElementById('betModalNumberHidden').value = number;
    document.getElementById('betAmount').value = '';
    document.getElementById('betModal').style.display = 'flex';
  }

  // Close bet modal
  static closeBetModal() {
    document.getElementById('betModal').style.display = 'none';
  }

  // Place bet
  static async placeBet() {
    const gameType = document.getElementById('betModalGameTypeHidden').value;
    const number = parseInt(document.getElementById('betModalNumberHidden').value);
    const amount = parseFloat(document.getElementById('betAmount').value);
    
    if (!amount || amount <= 0) {
      alert('Please enter valid bet amount');
      return;
    }
    
    try {
      // Save bet to database
      const { error } = await supabase
        .from('number_bets')
        .insert({
          game_type: gameType,
          number: number,
          bet_amount: amount,
          username: 'Admin'
        });
      
      if (error) throw error;
      
      // Update local bets
      const key = `${gameType}-${number}`;
      NumberSystem.bets[key] = (NumberSystem.bets[key] || 0) + amount;
      
      // Refresh grid
      NumberSystem.showNumberGrid(gameType);
      NumberSystem.closeBetModal();
      
      showToast(`Bet placed: ₹${amount} on ${number} (Potential win: ₹${(amount * 80).toFixed(0)})`);
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place bet');
    }
  }

  // Load existing bets
  static async loadBets(gameType) {
    try {
      const { data, error } = await supabase
        .from('number_bets')
        .select('number, bet_amount')
        .eq('game_type', gameType)
        .eq('bet_date', new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      
      // Aggregate bets by number
      NumberSystem.bets = {};
      (data || []).forEach(bet => {
        const key = `${gameType}-${bet.number}`;
        NumberSystem.bets[key] = (NumberSystem.bets[key] || 0) + parseFloat(bet.bet_amount);
      });
      
      NumberSystem.showNumberGrid(gameType);
    } catch (error) {
      console.error('Error loading bets:', error);
    }
  }
}

window.NumberSystem = NumberSystem;
