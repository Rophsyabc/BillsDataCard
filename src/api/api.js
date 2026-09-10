import {
  networks,
  airtimeAmounts,
  smileAirtimeAmounts,
  dataPlans,
  electricityDiscos,
  tvProviders,
  giftCards,
  bettingPlatforms,
  mockTransactions,
} from './mockData';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const simulateDelay = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms));

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('paybills_user'));
    return user?.id || 'default';
  } catch {
    return 'default';
  }
}

let transactions = [...mockTransactions];

const addTransaction = (txn) => {
  transactions.unshift(txn);
  return txn;
};

// ── Backend API helper ──
async function callBackend(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(`[api] Backend call failed for ${path}:`, err.message);
    return null;
  }
}

// ── Reloadly Config Check ──
let reloadlyStatus = null;
async function getReloadlyStatus() {
  if (reloadlyStatus) return reloadlyStatus;
  const res = await callBackend('/api/reloadly/status');
  reloadlyStatus = res || { configured: false, environment: 'sandbox' };
  return reloadlyStatus;
}

export const api = {
  // ── Reloadly Status ──
  getReloadlyStatus: async () => {
    return getReloadlyStatus();
  },

  // ── Reloadly Countries ──
  getReloadlyCountries: async () => {
    const res = await callBackend('/api/reloadly/countries');
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch countries' };
  },

  // ── Reloadly Operators ──
  getReloadlyOperators: async (countryIso) => {
    const path = countryIso
      ? `/api/reloadly/operators/countries/${countryIso}`
      : '/api/reloadly/operators';
    const res = await callBackend(path);
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch operators' };
  },

  // ── Reloadly Operator by ID ──
  getReloadlyOperator: async (id) => {
    const res = await callBackend(`/api/reloadly/operators/${id}`);
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch operator' };
  },

  // ── Reloadly Auto-detect Operator ──
  detectOperator: async (phone, countryCode) => {
    const res = await callBackend(`/api/reloadly/operators/detect/${phone}/${countryCode}`);
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to detect operator' };
  },

  // ── Reloadly Balance ──
  getReloadlyBalance: async () => {
    const res = await callBackend('/api/reloadly/balance');
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch balance' };
  },

  // ── Reloadly FX Rate ──
  getReloadlyFXRate: async (operatorId, amount) => {
    const res = await callBackend(`/api/reloadly/fx-rate?operatorId=${operatorId}&amount=${amount}`);
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch FX rate' };
  },

  // ── Reloadly Top-up Status ──
  getReloadlyTopupStatus: async (transactionId) => {
    const res = await callBackend(`/api/reloadly/topup/status/${transactionId}`);
    if (res?.success) return { success: true, data: res.data };
    return { success: false, message: res?.message || 'Failed to fetch status' };
  },

  // ── Airtime ──
  getNetworks: async () => {
    const status = await getReloadlyStatus();

    if (status.configured) {
      // Try to fetch operators from Reloadly (filtered for Nigeria)
      const res = await callBackend('/api/reloadly/operators/countries/NG');
      if (res?.success && res.data?.length > 0) {
        // Group operators by name pattern to map to networks
        const operatorMap = {};
        res.data.forEach((op) => {
          const name = op.name.toLowerCase();
          let networkId = null;
          if (name.includes('mtn')) networkId = 'mtn';
          else if (name.includes('airtel')) networkId = 'airtel';
          else if (name.includes('glo') || name.includes('globacom')) networkId = 'glo';
          else if (name.includes('9mobile') || name.includes('etisalat')) networkId = '9mobile';

          if (networkId && !operatorMap[networkId]) {
            operatorMap[networkId] = {
              id: networkId,
              name: networkId === 'glo' ? 'Globacom' : networkId === '9mobile' ? '9mobile' : op.name.split(' ')[0],
              reloadlyOperators: [],
            };
          }
          if (networkId) {
            operatorMap[networkId].reloadlyOperators.push(op);
          }
        });

        if (Object.keys(operatorMap).length > 0) {
          const reloadlyNetworks = Object.values(operatorMap).map((n) => ({
            ...networks.find((net) => net.id === n.id) || { id: n.id, name: n.name, logo: '📱' },
            reloadlyOperators: n.reloadlyOperators,
          }));

          // Always include Smile (not available on Reloadly)
          const smileNet = networks.find((net) => net.id === 'smile');
          if (smileNet && !reloadlyNetworks.find((n) => n.id === 'smile')) {
            reloadlyNetworks.push(smileNet);
          }

          return {
            success: true,
            data: reloadlyNetworks,
            source: 'reloadly',
          };
        }
      }
    }

    // Fallback to mock
    await simulateDelay();
    return { success: true, data: networks, source: 'mock' };
  },

  getAirtimeAmounts: async (network) => {
    await simulateDelay(300);
    if (network === 'smile') {
      return { success: true, data: smileAirtimeAmounts };
    }
    return { success: true, data: airtimeAmounts };
  },

  buyAirtime: async ({ network, phone, amount, operatorId, countryCode }) => {
    const status = await getReloadlyStatus();

    // Try Reloadly backend if configured
    if (status.configured && operatorId) {
      const res = await callBackend('/api/reloadly/topup', {
        method: 'POST',
        body: JSON.stringify({
          operatorId,
          amount,
          phone,
          countryCode: countryCode || 'NG',
          customIdentifier: `AIR${Date.now()}`,
        }),
      });

      if (res?.success) {
        return {
          success: true,
          message: res.data.transaction.reloadlyStatus === 'SUCCESSFUL'
            ? 'Airtime purchase successful'
            : 'Airtime purchase is being processed',
          data: {
            reference: res.data.transaction.id,
            network,
            phone,
            amount,
            status: res.data.transaction.status,
            reloadlyTransactionId: res.data.reloadly?.transactionId,
          },
        };
      }

      // If Reloadly call failed, fall through to mock
      if (res !== null) {
        return { success: false, message: res.message || 'Airtime purchase failed' };
      }
    }

    // Mock fallback - call backend to deduct from server wallet
    await simulateDelay(1500);
    if (!network || !phone || !amount) {
      return { success: false, message: 'All fields are required' };
    }
    const res = await callBackend('/api/airtime/buy', {
      method: 'POST',
      body: JSON.stringify({ network, phone, amount, userId: getUserId() }),
    });
    if (res?.success) {
      const net = networks.find((n) => n.id === network);
      return {
        success: true,
        message: `${net?.name || network} airtime purchase successful`,
        data: {
          reference: res.data.transaction.id,
          network,
          phone,
          amount,
          status: 'success',
          balance: res.data.balance,
        },
      };
    }
    return { success: false, message: res?.message || 'Airtime purchase failed' };
  },

  // ── Smile Airtime ──
  buySmileAirtime: async ({ phone, amount }) => {
    await simulateDelay(1500);
    if (!phone || !amount) {
      return { success: false, message: 'All fields are required' };
    }
    const res = await callBackend('/api/airtime/buy', {
      method: 'POST',
      body: JSON.stringify({ network: 'smile', phone, amount, userId: getUserId() }),
    });
    if (res?.success) {
      return {
        success: true,
        message: 'Smile airtime purchase successful',
        data: {
          reference: res.data.transaction.id,
          phone,
          amount,
          status: 'success',
          balance: res.data.balance,
        },
      };
    }
    return { success: false, message: res?.message || 'Smile airtime purchase failed' };
  },

  // ── Data ──
  getDataPlans: async (network) => {
    await simulateDelay();
    const plans = dataPlans[network] || [];
    return { success: true, data: plans };
  },

  buyData: async ({ network, phone, plan, operatorId, countryCode }) => {
    const status = await getReloadlyStatus();

    // Try Reloadly backend if configured
    if (status.configured && operatorId) {
      const res = await callBackend('/api/reloadly/topup', {
        method: 'POST',
        body: JSON.stringify({
          operatorId,
          amount: plan.price || plan,
          phone,
          countryCode: countryCode || 'NG',
          customIdentifier: `DAT${Date.now()}`,
        }),
      });

      if (res?.success) {
        return {
          success: true,
          message: res.data.transaction.reloadlyStatus === 'SUCCESSFUL'
            ? 'Data purchase successful'
            : 'Data purchase is being processed',
          data: {
            reference: res.data.transaction.id,
            network,
            phone,
            plan: plan.name || plan,
            amount: plan.price || plan,
            status: res.data.transaction.status,
            reloadlyTransactionId: res.data.reloadly?.transactionId,
          },
        };
      }

      if (res !== null) {
        return { success: false, message: res.message || 'Data purchase failed' };
      }
    }

    // Mock fallback - call backend to deduct from server wallet
    await simulateDelay(1500);
    if (!network || !phone || !plan) {
      return { success: false, message: 'All fields are required' };
    }
    const res = await callBackend('/api/data/buy', {
      method: 'POST',
      body: JSON.stringify({ network, phone, plan, userId: getUserId() }),
    });
    if (res?.success) {
      const net = networks.find((n) => n.id === network);
      return {
        success: true,
        message: 'Data purchase successful',
        data: {
          reference: res.data.transaction.id,
          network,
          phone,
          plan: plan.name,
          amount: plan.price,
          status: 'success',
          balance: res.data.balance,
        },
      };
    }
    return { success: false, message: res?.message || 'Data purchase failed' };
  },

  // ── Electricity ──
  getElectricityDiscos: async () => {
    await simulateDelay(300);
    return { success: true, data: electricityDiscos };
  },

  validateMeter: async ({ disco, meterNumber, meterType }) => {
    await simulateDelay(1200);
    if (!disco || !meterNumber) {
      return { success: false, message: 'Disco and meter number are required' };
    }
    const d = electricityDiscos.find((d) => d.id === disco);
    return {
      success: true,
      data: {
        address: '123 Example Street, Lagos',
        name: 'John Doe',
        meterNumber,
        meterType,
        disco: d?.name,
      },
    };
  },

  buyElectricity: async ({ disco, meterNumber, meterType, amount }) => {
    if (!disco || !meterNumber || !amount) {
      return { success: false, message: 'All fields are required' };
    }
    const d = electricityDiscos.find((d) => d.id === disco);
    const res = await callBackend('/api/electricity/buy', {
      method: 'POST',
      body: JSON.stringify({ disco, meterNumber, meterType, amount: parseInt(amount), userId: getUserId() }),
    });
    if (res?.success) {
      return {
        success: true,
        message: 'Electricity purchase successful',
        data: {
          reference: res.data.transaction.id,
          disco: d?.name,
          meterNumber,
          amount: parseInt(amount),
          token: res.data.transaction.token,
          balance: res.data.balance,
          status: 'success',
        },
      };
    }
    return { success: false, message: res?.message || 'Electricity purchase failed' };
  },

  // ── TV Subscription ──
  getTvProviders: async () => {
    await simulateDelay(300);
    return { success: true, data: tvProviders };
  },

  getTvPackages: async (providerId) => {
    await simulateDelay(500);
    const provider = tvProviders.find((p) => p.id === providerId);
    return { success: true, data: provider ? provider.packages : [] };
  },

  buyTvSubscription: async ({ provider, iuc, packageId }) => {
    if (!provider || !iuc || !packageId) {
      return { success: false, message: 'All fields are required' };
    }
    const tvProvider = tvProviders.find((p) => p.id === provider);
    const pkg = tvProvider?.packages.find((p) => p.id === packageId);
    const res = await callBackend('/api/tv/subscribe', {
      method: 'POST',
      body: JSON.stringify({ provider, iuc, packageId, packageName: pkg?.name, amount: pkg?.price, userId: getUserId() }),
    });
    if (res?.success) {
      return {
        success: true,
        message: 'TV subscription successful',
        data: {
          reference: res.data.transaction.id,
          provider: tvProvider?.name,
          package: pkg?.name,
          iuc,
          amount: pkg?.price,
          balance: res.data.balance,
          status: 'success',
        },
      };
    }
    return { success: false, message: res?.message || 'TV subscription failed' };
  },

  // ── Gift Cards ──
  getGiftCards: async () => {
    await simulateDelay(300);
    return { success: true, data: giftCards };
  },

  buyGiftCard: async ({ cardId, amount, email }) => {
    if (!cardId || !amount || !email) {
      return { success: false, message: 'All fields are required' };
    }
    const card = giftCards.find((c) => c.id === cardId);
    const totalCost = parseInt(amount) * card?.rate;
    const res = await callBackend('/api/giftcard/buy', {
      method: 'POST',
      body: JSON.stringify({ cardId, cardName: card?.name, amount: parseInt(amount), email, totalCost, userId: getUserId() }),
    });
    if (res?.success) {
      return {
        success: true,
        message: 'Gift card purchase successful',
        data: {
          reference: res.data.transaction.id,
          card: card?.name,
          amount,
          email,
          totalCost,
          balance: res.data.balance,
          status: 'success',
        },
      };
    }
    return { success: false, message: res?.message || 'Gift card purchase failed' };
  },

  // ── Betting ──
  getBettingPlatforms: async () => {
    await simulateDelay(300);
    return { success: true, data: bettingPlatforms };
  },

  fundBetting: async ({ platform, userId, amount }) => {
    if (!platform || !userId || !amount) {
      return { success: false, message: 'All fields are required' };
    }
    const p = bettingPlatforms.find((b) => b.id === platform);
    const res = await callBackend('/api/betting/fund', {
      method: 'POST',
      body: JSON.stringify({ platform, betUserId: userId, amount: parseInt(amount), userId: getUserId() }),
    });
    if (res?.success) {
      return {
        success: true,
        message: `${p?.name || platform} fund successful`,
        data: {
          reference: res.data.transaction.id,
          platform: p?.name,
          userId,
          amount: parseInt(amount),
          balance: res.data.balance,
          status: 'success',
        },
      };
    }
    return { success: false, message: res?.message || 'Betting fund failed' };
  },

  // ── Wallet ──
  getBalance: async () => {
    // Try backend first
    const res = await callBackend('/api/wallet');
    if (res?.success) return { success: true, data: res.data };
    // Fallback
    await simulateDelay(300);
    return { success: true, data: { balance: 50000 } };
  },

  fundWallet: async ({ amount, method }) => {
    const res = await callBackend('/api/wallet/fund', {
      method: 'POST',
      body: JSON.stringify({ amount, method, userId: getUserId() }),
    });
    if (res?.success) return res;

    // Mock fallback
    await simulateDelay(1500);
    if (!amount || amount < 100) {
      return { success: false, message: 'Minimum funding amount is ₦100' };
    }
    const ref = `FUND${Date.now()}`;
    addTransaction({
      id: ref,
      type: 'Wallet',
      service: `Wallet Funding (${method})`,
      amount,
      status: 'success',
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    return {
      success: true,
      message: 'Wallet funded successfully',
      data: { reference: ref, amount, method, status: 'success' },
    };
  },

  transferWallet: async ({ recipient, amount, note }) => {
    const res = await callBackend('/api/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({ recipient, amount, note, userId: getUserId() }),
    });
    if (res?.success) return res;

    // Mock fallback
    await simulateDelay(1500);
    if (!recipient || !amount) {
      return { success: false, message: 'Recipient and amount are required' };
    }
    const ref = `TRF${Date.now()}`;
    addTransaction({
      id: ref,
      type: 'Transfer',
      service: `Transfer to ${recipient}`,
      amount,
      note,
      status: 'success',
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    return {
      success: true,
      message: 'Transfer successful',
      data: { reference: ref, recipient, amount, status: 'success' },
    };
  },

  // ── Transactions ──
  getTransactions: async () => {
    // Try backend first
    const res = await callBackend('/api/transactions');
    if (res?.success && res.data?.length > 0) {
      return { success: true, data: res.data };
    }
    // Fallback to local mock
    await simulateDelay(500);
    return { success: true, data: transactions };
  },

  // ── Receipt ──
  getReceipt: async (ref) => {
    // Try backend first
    const res = await callBackend(`/api/transactions/${ref}`);
    if (res?.success) return res;

    // Fallback to local mock
    await simulateDelay(500);
    const txn = transactions.find((t) => t.id === ref);
    if (txn) {
      return { success: true, data: txn };
    }
    return { success: false, message: 'Transaction not found' };
  },
};
