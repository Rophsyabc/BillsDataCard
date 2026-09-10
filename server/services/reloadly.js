import axios from 'axios';

const isProduction = process.env.RELOADLY_ENV === 'production';

const CLIENT_ID = isProduction
  ? process.env.RELOADLY_PROD_CLIENT_ID
  : process.env.RELOADLY_SANDBOX_CLIENT_ID;

const CLIENT_SECRET = isProduction
  ? process.env.RELOADLY_PROD_CLIENT_SECRET
  : process.env.RELOADLY_SANDBOX_CLIENT_SECRET;

const AUTH_URL = 'https://auth.reloadly.com/oauth/token';
const BASE_URL = isProduction
  ? 'https://topups.reloadly.com'
  : 'https://topups-sandbox.reloadly.com';

const AUDIENCE = isProduction
  ? 'https://topups.reloadly.com'
  : 'https://topups-sandbox.reloadly.com';

// ── Token Cache ──
let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

async function getAccessToken() {
  const now = Date.now();

  // Return cached token if still valid (with 5-min buffer)
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Reloadly credentials not configured. Set RELOADLY_SANDBOX_CLIENT_ID and RELOADLY_SANDBOX_CLIENT_SECRET in .env'
    );
  }

  const response = await axios.post(
    AUTH_URL,
    {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: AUDIENCE,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { access_token, expires_in } = response.data;

  tokenCache = {
    accessToken: access_token,
    expiresAt: now + expires_in * 1000,
  };

  console.log(`[reloadly] Token refreshed, expires in ${expires_in}s`);
  return access_token;
}

// ── Generic API caller ──
async function apiCall(method, path, data = null, params = null) {
  const token = await getAccessToken();
  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/com.reloadly.topups-v1+json',
    },
  };
  if (data) config.data = data;
  if (params) config.params = params;

  const response = await axios(config);
  return response.data;
}

// ── Public API ──

export function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function getEnvironment() {
  return isProduction ? 'production' : 'sandbox';
}

// Countries
export async function getCountries() {
  return apiCall('GET', '/countries');
}

export async function getCountryByISO(iso) {
  return apiCall('GET', `/countries/${iso}`);
}

// Operators
export async function getOperators(params = {}) {
  return apiCall('GET', '/operators', null, {
    includeBundles: params.includeBundles ?? true,
    includeData: params.includeData ?? true,
    ...params,
  });
}

export async function getOperatorById(id) {
  return apiCall('GET', `/operators/${id}`);
}

export async function getOperatorsByCountry(iso) {
  return apiCall('GET', `/operators/countries/${iso}`);
}

export async function autoDetectOperator(phone, countryCode) {
  return apiCall('GET', `/operators/auto-detect/phone/${phone}/countries/${countryCode}`);
}

// Balance
export async function getBalance() {
  return apiCall('GET', '/balance');
}

// Top-ups
export async function makeTopup({
  operatorId,
  amount,
  phone,
  countryCode,
  customIdentifier,
  useLocalAmount = false,
  senderPhone,
  senderCountryCode,
}) {
  const body = {
    operatorId,
    amount: parseFloat(amount),
    useLocalAmount,
    recipientPhone: {
      countryCode,
      number: phone,
    },
  };

  if (customIdentifier) body.customIdentifier = customIdentifier;
  if (senderPhone && senderCountryCode) {
    body.senderPhone = {
      countryCode: senderCountryCode,
      number: senderPhone,
    };
  }

  return apiCall('POST', '/topups', body);
}

export async function makeAsyncTopup(params) {
  const body = {
    operatorId: params.operatorId,
    amount: parseFloat(params.amount),
    useLocalAmount: params.useLocalAmount ?? false,
    recipientPhone: {
      countryCode: params.countryCode,
      number: params.phone,
    },
  };

  if (params.customIdentifier) body.customIdentifier = params.customIdentifier;
  if (params.senderPhone && params.senderCountryCode) {
    body.senderPhone = {
      countryCode: params.senderCountryCode,
      number: params.senderPhone,
    };
  }

  return apiCall('POST', '/topups-async', body);
}

export async function getTopupStatus(transactionId) {
  return apiCall('GET', `/topups/${transactionId}/status`);
}

// Transactions
export async function getTransactions(params = {}) {
  return apiCall('GET', '/transactions', null, {
    size: params.size ?? 200,
    page: params.page ?? 1,
    ...params,
  });
}

export async function getTransactionById(id) {
  return apiCall('GET', `/transactions/${id}`);
}

// FX Rates
export async function getFXRate(operatorId, amount) {
  return apiCall('GET', '/fx', null, { operatorId, amount });
}

// Commissions
export async function getCommissions() {
  return apiCall('GET', '/commissions');
}

export async function getCommissionByOperatorId(operatorId) {
  return apiCall('GET', `/commissions/${operatorId}`);
}
