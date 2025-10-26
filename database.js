// Supabase Configuration
const SUPABASE_URL = 'https://auweujfhgapogwckwjyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1d2V1amZoZ2Fwb2d3Y2t3anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjU2MTAsImV4cCI6MjA3NzA0MTYxMH0.vFPap5BY2JqrMKMTTgQshmjeIC1arRSoQLpMNQwp_t0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Functions
class DatabaseManager {
  // Supermaster Functions
  static async createSupermaster(username, loginName, password, winCommission, lossCommission) {
    const { data, error } = await supabase
      .from('supermasters')
      .insert({
        username,
        login_name: loginName,
        password,
        win_commission: winCommission,
        loss_commission: lossCommission
      })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getSupermaster(loginName, password) {
    const { data, error } = await supabase
      .from('supermasters')
      .select('*')
      .eq('login_name', loginName)
      .eq('password', password)
      .eq('blocked', false)
      .single();
    
    if (error) return null;
    return data;
  }

  static async getAllSupermasters() {
    const { data, error } = await supabase
      .from('supermasters')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Master Functions
  static async createMaster(username, loginName, password, supermasterId, winCommission, lossCommission) {
    const { data, error } = await supabase
      .from('masters')
      .insert({
        username,
        login_name: loginName,
        password,
        supermaster_id: supermasterId,
        win_commission: winCommission,
        loss_commission: lossCommission
      })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getMaster(loginName, password) {
    const { data, error } = await supabase
      .from('masters')
      .select('*')
      .eq('login_name', loginName)
      .eq('password', password)
      .eq('blocked', false)
      .single();
    
    if (error) return null;
    return data;
  }

  static async getMastersBySupermasterId(supermasterId) {
    const { data, error } = await supabase
      .from('masters')
      .select('*')
      .eq('supermaster_id', supermasterId)
      .eq('blocked', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Agent Functions
  static async createAgent(username, loginName, password, masterId, winCommission, lossCommission) {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        username,
        login_name: loginName,
        password,
        master_id: masterId,
        win_commission: winCommission,
        loss_commission: lossCommission
      })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getAgent(loginName, password) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('login_name', loginName)
      .eq('password', password)
      .eq('blocked', false)
      .single();
    
    if (error) return null;
    return data;
  }

  static async getAgentsByMasterId(masterId) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('master_id', masterId)
      .eq('blocked', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Client Functions
  static async createClient(username, loginName, password, agentId, initialBalance = 0) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        username,
        login_name: loginName,
        password,
        agent_id: agentId,
        balance: initialBalance
      })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getClient(loginName, password) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('login_name', loginName)
      .eq('password', password)
      .eq('blocked', false)
      .single();
    
    if (error) return null;
    return data;
  }

  static async getClientsByAgentId(agentId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('agent_id', agentId)
      .eq('blocked', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async updateClientBalance(clientId, newBalance) {
    const { data, error } = await supabase
      .from('clients')
      .update({ balance: newBalance })
      .eq('id', clientId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async updateLastLogin(clientId) {
    const { data, error } = await supabase
      .from('clients')
      .update({ last_login: new Date().toISOString() })
      .eq('id', clientId);
    
    if (error) throw error;
    return data;
  }

  // Transaction Functions
  static async recordTransaction(userId, userType, transactionType, amount, description = '') {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        user_type: userType,
        transaction_type: transactionType,
        amount,
        description
      })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async getTransactionsByUser(userId, userType) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Block/Unblock Functions
  static async toggleUserBlock(userType, userId, blocked) {
    const table = userType === 'supermaster' ? 'supermasters' : 
                 userType === 'master' ? 'masters' : 
                 userType === 'agent' ? 'agents' : 'clients';
    
    const { data, error } = await supabase
      .from(table)
      .update({ blocked })
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Dashboard Functions
  static async getDashboardStats() {
    const [superMasters, masters, agents, clients] = await Promise.all([
      supabase.from('supermasters').select('*').eq('blocked', false),
      supabase.from('masters').select('*').eq('blocked', false),
      supabase.from('agents').select('*').eq('blocked', false),
      supabase.from('clients').select('*').eq('blocked', false)
    ]);
    
    return {
      superMasters: superMasters.data?.length || 0,
      masters: masters.data?.length || 0,
      agents: agents.data?.length || 0,
      clients: clients.data?.length || 0
    };
  }
}

// Export for use in other files
window.DatabaseManager = DatabaseManager;