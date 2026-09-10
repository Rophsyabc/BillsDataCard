// Nigerian phone number prefix to network mapping
const networkPrefixes = {
  mtn: ['0803', '0806', '0816', '0903', '0906', '0703', '0706', '0810', '0813', '0913'],
  airtel: ['0802', '0808', '0812', '0708', '0701', '0902', '0907', '0908', '0701'],
  glo: ['0805', '0807', '0815', '0705', '0811', '0905'],
  '9mobile': ['0809', '0817', '0818', '0909'],
  smile: ['07020'],
};

export function detectNetwork(phone) {
  if (!phone || phone.length < 4) return null;
  const prefix = phone.substring(0, 4);
  for (const [network, prefixes] of Object.entries(networkPrefixes)) {
    if (prefixes.includes(prefix)) return network;
  }
  return null;
}

export function validatePhoneNetwork(phone, selectedNetwork) {
  if (!phone || phone.length < 4) return { valid: true };
  const detected = detectNetwork(phone);
  if (detected && detected !== selectedNetwork) {
    return {
      valid: false,
      detected,
      message: `This number belongs to ${detected.toUpperCase()}, not ${selectedNetwork.toUpperCase()}`,
    };
  }
  return { valid: true };
}
