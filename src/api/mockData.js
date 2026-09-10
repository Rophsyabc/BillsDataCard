import mtnLogo from '../assets/logos/mtn.svg';
import airtelLogo from '../assets/logos/airtel.svg';
import gloLogo from '../assets/logos/glo.svg';
import nineMobileLogo from '../assets/logos/9mobile.svg';
import smileLogo from '../assets/logos/smile.svg';

import amazonLogo from '../assets/logos/giftcards/amazon.svg';
import appleLogo from '../assets/logos/giftcards/apple.svg';
import googlePlayLogo from '../assets/logos/giftcards/google-play.svg';
import steamLogo from '../assets/logos/giftcards/steam.svg';
import spotifyLogo from '../assets/logos/giftcards/spotify.svg';
import netflixLogo from '../assets/logos/giftcards/netflix.svg';
import playstationLogo from '../assets/logos/giftcards/playstation.svg';
import xboxLogo from '../assets/logos/giftcards/xbox.svg';
import itunesLogo from '../assets/logos/giftcards/itunes.svg';
import robloxLogo from '../assets/logos/giftcards/roblox.svg';
import sephoraLogo from '../assets/logos/giftcards/sephora.svg';
import nikeLogo from '../assets/logos/giftcards/nike.svg';
import walmartLogo from '../assets/logos/giftcards/walmart.svg';
import ebayLogo from '../assets/logos/giftcards/ebay.svg';
import bestbuyLogo from '../assets/logos/giftcards/bestbuy.svg';
import uberLogo from '../assets/logos/giftcards/uber.svg';
import airbnbLogo from '../assets/logos/giftcards/airbnb.svg';
import zoomLogo from '../assets/logos/giftcards/zoom.svg';
import huluLogo from '../assets/logos/giftcards/hulu.svg';
import chickfilaLogo from '../assets/logos/giftcards/chickfila.svg';
import youtubeLogo from '../assets/logos/giftcards/youtube.svg';
import googleLogo from '../assets/logos/giftcards/google.svg';
import paypalLogo from '../assets/logos/giftcards/paypal.svg';

import bet9jaLogo from '../assets/logos/betting/bet9ja.svg';
import sportybetLogo from '../assets/logos/betting/sportybet.svg';
import betkingLogo from '../assets/logos/betting/betking.svg';
import nairabetLogo from '../assets/logos/betting/nairabet.svg';
import onexbetLogo from '../assets/logos/betting/1xbet.svg';
import merrybetLogo from '../assets/logos/betting/merrybet.svg';

import dstvLogo from '../assets/logos/tv/dstv.svg';
import gotvLogo from '../assets/logos/tv/gotv.svg';
import startimesLogo from '../assets/logos/tv/startimes.svg';

export const networks = [
  { id: 'mtn', name: 'MTN', logo: mtnLogo, color: '#FFCC00' },
  { id: 'airtel', name: 'Airtel', logo: airtelLogo, color: '#ED1C24' },
  { id: 'glo', name: 'Glo', logo: gloLogo, color: '#00A651' },
  { id: '9mobile', name: '9mobile', logo: nineMobileLogo, color: '#006B3F' },
  { id: 'smile', name: 'Smile', logo: smileLogo, color: '#00AEEF' },
];

export const airtimeAmounts = [100, 200, 500, 1000, 2000, 3000, 5000, 10000];

export const dataPlans = {
  mtn: [
    { id: 'mtn-d1', name: '75MB - 1 Day', price: 100, validity: '1 Day', size: '75MB', category: 'daily' },
    { id: 'mtn-d2', name: '150MB - 1 Day', price: 200, validity: '1 Day', size: '150MB', category: 'daily' },
    { id: 'mtn-d3', name: '350MB - 1 Day', price: 350, validity: '1 Day', size: '350MB', category: 'daily' },
    { id: 'mtn-w1', name: '350MB - 7 Days', price: 500, validity: '7 Days', size: '350MB', category: 'weekly' },
    { id: 'mtn-w2', name: '750MB - 7 Days', price: 1000, validity: '7 Days', size: '750MB', category: 'weekly' },
    { id: 'mtn-w3', name: '1.5GB - 7 Days', price: 1500, validity: '7 Days', size: '1.5GB', category: 'weekly' },
    { id: 'mtn-m1', name: '300MB - 30 Days', price: 500, validity: '30 Days', size: '300MB', category: 'monthly' },
    { id: 'mtn-m2', name: '1GB - 30 Days', price: 1000, validity: '30 Days', size: '1GB', category: 'monthly' },
    { id: 'mtn-m3', name: '1.5GB - 30 Days', price: 1500, validity: '30 Days', size: '1.5GB', category: 'monthly' },
    { id: 'mtn-m4', name: '2GB - 30 Days', price: 2000, validity: '30 Days', size: '2GB', category: 'monthly' },
    { id: 'mtn-m5', name: '3GB - 30 Days', price: 3000, validity: '30 Days', size: '3GB', category: 'monthly' },
    { id: 'mtn-m6', name: '5GB - 30 Days', price: 5000, validity: '30 Days', size: '5GB', category: 'monthly' },
    { id: 'mtn-m7', name: '10GB - 30 Days', price: 10000, validity: '30 Days', size: '10GB', category: 'monthly' },
    { id: 'mtn-m8', name: '15GB - 30 Days', price: 15000, validity: '30 Days', size: '15GB', category: 'monthly' },
    { id: 'mtn-m9', name: '25GB - 30 Days', price: 20000, validity: '30 Days', size: '25GB', category: 'monthly' },
    { id: 'mtn-u1', name: '50GB - 30 Days', price: 30000, validity: '30 Days', size: '50GB', category: 'unlimited' },
    { id: 'mtn-u2', name: '100GB - 30 Days', price: 50000, validity: '30 Days', size: '100GB', category: 'unlimited' },
    { id: 'mtn-u3', name: 'Unlimited - 30 Days', price: 80000, validity: '30 Days', size: 'Unlimited', category: 'unlimited' },
  ],
  airtel: [
    { id: 'airtel-d1', name: '50MB - 1 Day', price: 100, validity: '1 Day', size: '50MB', category: 'daily' },
    { id: 'airtel-d2', name: '100MB - 1 Day', price: 200, validity: '1 Day', size: '100MB', category: 'daily' },
    { id: 'airtel-d3', name: '200MB - 1 Day', price: 350, validity: '1 Day', size: '200MB', category: 'daily' },
    { id: 'airtel-w1', name: '350MB - 7 Days', price: 500, validity: '7 Days', size: '350MB', category: 'weekly' },
    { id: 'airtel-w2', name: '750MB - 7 Days', price: 1000, validity: '7 Days', size: '750MB', category: 'weekly' },
    { id: 'airtel-w3', name: '1.5GB - 7 Days', price: 1500, validity: '7 Days', size: '1.5GB', category: 'weekly' },
    { id: 'airtel-m1', name: '500MB - 30 Days', price: 500, validity: '30 Days', size: '500MB', category: 'monthly' },
    { id: 'airtel-m2', name: '1GB - 30 Days', price: 1000, validity: '30 Days', size: '1GB', category: 'monthly' },
    { id: 'airtel-m3', name: '1.5GB - 30 Days', price: 1500, validity: '30 Days', size: '1.5GB', category: 'monthly' },
    { id: 'airtel-m4', name: '3GB - 30 Days', price: 2000, validity: '30 Days', size: '3GB', category: 'monthly' },
    { id: 'airtel-m5', name: '6GB - 30 Days', price: 3000, validity: '30 Days', size: '6GB', category: 'monthly' },
    { id: 'airtel-m6', name: '10GB - 30 Days', price: 5000, validity: '30 Days', size: '10GB', category: 'monthly' },
    { id: 'airtel-m7', name: '20GB - 30 Days', price: 8000, validity: '30 Days', size: '20GB', category: 'monthly' },
    { id: 'airtel-m8', name: '25GB - 30 Days', price: 10000, validity: '30 Days', size: '25GB', category: 'monthly' },
    { id: 'airtel-u1', name: '40GB - 30 Days', price: 20000, validity: '30 Days', size: '40GB', category: 'unlimited' },
    { id: 'airtel-u2', name: 'Unlimited - 30 Days', price: 50000, validity: '30 Days', size: 'Unlimited', category: 'unlimited' },
  ],
  glo: [
    { id: 'glo-d1', name: '35MB - 1 Day', price: 50, validity: '1 Day', size: '35MB', category: 'daily' },
    { id: 'glo-d2', name: '100MB - 1 Day', price: 100, validity: '1 Day', size: '100MB', category: 'daily' },
    { id: 'glo-d3', name: '200MB - 1 Day', price: 200, validity: '1 Day', size: '200MB', category: 'daily' },
    { id: 'glo-w1', name: '350MB - 14 Days', price: 300, validity: '14 Days', size: '350MB', category: 'weekly' },
    { id: 'glo-w2', name: '750MB - 14 Days', price: 500, validity: '14 Days', size: '750MB', category: 'weekly' },
    { id: 'glo-w3', name: '1GB - 14 Days', price: 1000, validity: '14 Days', size: '1GB', category: 'weekly' },
    { id: 'glo-m1', name: '1GB - 30 Days', price: 1000, validity: '30 Days', size: '1GB', category: 'monthly' },
    { id: 'glo-m2', name: '2.5GB - 30 Days', price: 2000, validity: '30 Days', size: '2.5GB', category: 'monthly' },
    { id: 'glo-m3', name: '5.8GB - 30 Days', price: 3000, validity: '30 Days', size: '5.8GB', category: 'monthly' },
    { id: 'glo-m4', name: '10GB - 30 Days', price: 5000, validity: '30 Days', size: '10GB', category: 'monthly' },
    { id: 'glo-m5', name: '14GB - 30 Days', price: 7000, validity: '30 Days', size: '14GB', category: 'monthly' },
    { id: 'glo-m6', name: '20GB - 30 Days', price: 10000, validity: '30 Days', size: '20GB', category: 'monthly' },
    { id: 'glo-m7', name: '29GB - 30 Days', price: 15000, validity: '30 Days', size: '29GB', category: 'monthly' },
    { id: 'glo-u1', name: '50GB - 30 Days', price: 20000, validity: '30 Days', size: '50GB', category: 'unlimited' },
    { id: 'glo-u2', name: '100GB - 30 Days', price: 36000, validity: '30 Days', size: '100GB', category: 'unlimited' },
  ],
  '9mobile': [
    { id: '9m-d1', name: '25MB - 1 Day', price: 50, validity: '1 Day', size: '25MB', category: 'daily' },
    { id: '9m-d2', name: '50MB - 1 Day', price: 100, validity: '1 Day', size: '50MB', category: 'daily' },
    { id: '9m-d3', name: '150MB - 1 Day', price: 200, validity: '1 Day', size: '150MB', category: 'daily' },
    { id: '9m-w1', name: '250MB - 7 Days', price: 300, validity: '7 Days', size: '250MB', category: 'weekly' },
    { id: '9m-w2', name: '500MB - 7 Days', price: 500, validity: '7 Days', size: '500MB', category: 'weekly' },
    { id: '9m-w3', name: '1GB - 7 Days', price: 1000, validity: '7 Days', size: '1GB', category: 'weekly' },
    { id: '9m-m1', name: '500MB - 30 Days', price: 500, validity: '30 Days', size: '500MB', category: 'monthly' },
    { id: '9m-m2', name: '1GB - 30 Days', price: 1000, validity: '30 Days', size: '1GB', category: 'monthly' },
    { id: '9m-m3', name: '2GB - 30 Days', price: 1500, validity: '30 Days', size: '2GB', category: 'monthly' },
    { id: '9m-m4', name: '3GB - 30 Days', price: 2000, validity: '30 Days', size: '3GB', category: 'monthly' },
    { id: '9m-m5', name: '5GB - 30 Days', price: 3000, validity: '30 Days', size: '5GB', category: 'monthly' },
    { id: '9m-m6', name: '10GB - 30 Days', price: 5000, validity: '30 Days', size: '10GB', category: 'monthly' },
    { id: '9m-m7', name: '15GB - 30 Days', price: 7500, validity: '30 Days', size: '15GB', category: 'monthly' },
    { id: '9m-u1', name: '25GB - 30 Days', price: 10000, validity: '30 Days', size: '25GB', category: 'unlimited' },
    { id: '9m-u2', name: '50GB - 30 Days', price: 20000, validity: '30 Days', size: '50GB', category: 'unlimited' },
  ],
  smile: [
    { id: 'sm-d1', name: '500MB - 7 Days', price: 500, validity: '7 Days', size: '500MB', category: 'weekly' },
    { id: 'sm-d2', name: '1GB - 7 Days', price: 1000, validity: '7 Days', size: '1GB', category: 'weekly' },
    { id: 'sm-m1', name: '1GB - 30 Days', price: 1000, validity: '30 Days', size: '1GB', category: 'monthly' },
    { id: 'sm-m2', name: '2GB - 30 Days', price: 1500, validity: '30 Days', size: '2GB', category: 'monthly' },
    { id: 'sm-m3', name: '3GB - 30 Days', price: 2000, validity: '30 Days', size: '3GB', category: 'monthly' },
    { id: 'sm-m4', name: '5GB - 30 Days', price: 3000, validity: '30 Days', size: '5GB', category: 'monthly' },
    { id: 'sm-m5', name: '10GB - 30 Days', price: 5000, validity: '30 Days', size: '10GB', category: 'monthly' },
    { id: 'sm-m6', name: '15GB - 30 Days', price: 7000, validity: '30 Days', size: '15GB', category: 'monthly' },
    { id: 'sm-m7', name: '25GB - 30 Days', price: 10000, validity: '30 Days', size: '25GB', category: 'monthly' },
    { id: 'sm-m8', name: '50GB - 30 Days', price: 15000, validity: '30 Days', size: '50GB', category: 'monthly' },
    { id: 'sm-u1', name: '100GB - 30 Days', price: 25000, validity: '30 Days', size: '100GB', category: 'unlimited' },
    { id: 'sm-u2', name: 'Unlimited - 30 Days', price: 40000, validity: '30 Days', size: 'Unlimited', category: 'unlimited' },
  ],
};

export const smileAirtimeAmounts = [500, 1000, 2000, 3000, 5000, 10000, 15000, 20000];

export const electricityDiscos = [
  { id: 'ikeja', name: 'Ikeja Electric', code: 'IKEDC' },
  { id: 'eko', name: 'Eko Electricity', code: 'EKEDC' },
  { id: 'abuja', name: 'Abuja Electricity', code: 'AEDC' },
  { id: 'ibadan', name: 'Ibadan Electricity', code: 'IBEDC' },
  { id: 'enugu', name: 'Enugu Electricity', code: 'ENEDC' },
  { id: 'portharcourt', name: 'Port Harcourt Electricity', code: 'PHEDC' },
  { id: 'kaduna', name: 'Kaduna Electricity', code: 'KEDC' },
  { id: 'kano', name: 'Kano Electricity', code: 'KEDCO' },
  { id: 'benin', name: 'Benin Electricity', code: 'BEDC' },
  { id: 'jos', name: 'Jos Electricity', code: 'JEDC' },
];

export const tvProviders = [
  {
    id: 'dstv',
    name: 'DStv',
    logo: dstvLogo,
    color: '#0066CC',
    packages: [
      { id: 'dstv-1', name: 'DStv Yanga', price: 2950, period: '1 Month' },
      { id: 'dstv-2', name: 'DStv Confam', price: 5400, period: '1 Month' },
      { id: 'dstv-3', name: 'DStv Compact', price: 9000, period: '1 Month' },
      { id: 'dstv-4', name: 'DStv Compact Plus', price: 14250, period: '1 Month' },
      { id: 'dstv-5', name: 'DStv Premium', price: 24500, period: '1 Month' },
    ],
  },
  {
    id: 'gotv',
    name: 'GOtv',
    logo: gotvLogo,
    color: '#00A651',
    packages: [
      { id: 'gotv-1', name: 'GOtv Lite', price: 1100, period: '1 Month' },
      { id: 'gotv-2', name: 'GOtv Plus', price: 2500, period: '1 Month' },
      { id: 'gotv-3', name: 'GOtv Max', price: 4850, period: '1 Month' },
      { id: 'gotv-4', name: 'GOtv Supa', price: 7000, period: '1 Month' },
    ],
  },
  {
    id: 'startimes',
    name: 'StarTimes',
    logo: startimesLogo,
    color: '#CC0000',
    packages: [
      { id: 'startimes-1', name: 'Nova', price: 1600, period: '1 Month' },
      { id: 'startimes-2', name: 'Basic', price: 2600, period: '1 Month' },
      { id: 'startimes-3', name: 'Classic', price: 3800, period: '1 Month' },
      { id: 'startimes-4', name: 'Premium', price: 7500, period: '1 Month' },
    ],
  },
];

export const giftCards = [
  { id: 'amazon-us', name: 'Amazon US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: amazonLogo },
  { id: 'amazon-uk', name: 'Amazon UK', currency: 'GBP', minAmount: 10, maxAmount: 300, rate: 2000, logo: amazonLogo },
  { id: 'amazon-de', name: 'Amazon Germany', currency: 'EUR', minAmount: 10, maxAmount: 300, rate: 1750, logo: amazonLogo },
  { id: 'amazon-ca', name: 'Amazon Canada', currency: 'CAD', minAmount: 10, maxAmount: 200, rate: 1200, logo: amazonLogo },
  { id: 'apple-us', name: 'Apple US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: appleLogo },
  { id: 'apple-uk', name: 'Apple UK', currency: 'GBP', minAmount: 10, maxAmount: 200, rate: 2000, logo: appleLogo },
  { id: 'google-play-us', name: 'Google Play US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: googlePlayLogo },
  { id: 'google-play-ng', name: 'Google Play NG', currency: 'USD', minAmount: 10, maxAmount: 100, rate: 1600, logo: googlePlayLogo },
  { id: 'steam-us', name: 'Steam US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: steamLogo },
  { id: 'steam-eu', name: 'Steam Europe', currency: 'EUR', minAmount: 10, maxAmount: 200, rate: 1750, logo: steamLogo },
  { id: 'spotify', name: 'Spotify', currency: 'USD', minAmount: 10, maxAmount: 100, rate: 1600, logo: spotifyLogo },
  { id: 'netflix-us', name: 'Netflix US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: netflixLogo },
  { id: 'netflix-uk', name: 'Netflix UK', currency: 'GBP', minAmount: 10, maxAmount: 200, rate: 2000, logo: netflixLogo },
  { id: 'playstation-us', name: 'PlayStation US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: playstationLogo },
  { id: 'playstation-uk', name: 'PlayStation UK', currency: 'GBP', minAmount: 10, maxAmount: 200, rate: 2000, logo: playstationLogo },
  { id: 'xbox-us', name: 'Xbox US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: xboxLogo },
  { id: 'xbox-uk', name: 'Xbox UK', currency: 'GBP', minAmount: 10, maxAmount: 200, rate: 2000, logo: xboxLogo },
  { id: 'itunes-us', name: 'iTunes US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: itunesLogo },
  { id: 'itunes-uk', name: 'iTunes UK', currency: 'GBP', minAmount: 10, maxAmount: 200, rate: 2000, logo: itunesLogo },
  { id: 'roblox', name: 'Roblox', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: robloxLogo },
  { id: 'sephora-us', name: 'Sephora US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: sephoraLogo },
  { id: 'nike-us', name: 'Nike US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: nikeLogo },
  { id: 'walmart-us', name: 'Walmart US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: walmartLogo },
  { id: 'ebay-us', name: 'eBay US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: ebayLogo },
  { id: 'bestbuy-us', name: 'Best Buy US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: bestbuyLogo },
  { id: 'uber-us', name: 'Uber US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: uberLogo },
  { id: 'airbnb-us', name: 'Airbnb US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: airbnbLogo },
  { id: 'zoom-us', name: 'Zoom US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: zoomLogo },
  { id: 'hulu-us', name: 'Hulu US', currency: 'USD', minAmount: 10, maxAmount: 100, rate: 1600, logo: huluLogo },
  { id: 'chickfila-us', name: 'Chick-fil-A US', currency: 'USD', minAmount: 10, maxAmount: 100, rate: 1600, logo: chickfilaLogo },
  { id: 'youtube-us', name: 'YouTube US', currency: 'USD', minAmount: 10, maxAmount: 200, rate: 1600, logo: youtubeLogo },
  { id: 'google-us', name: 'Google US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: googleLogo },
  { id: 'paypal-us', name: 'PayPal US', currency: 'USD', minAmount: 10, maxAmount: 500, rate: 1600, logo: paypalLogo },
];

export const bettingPlatforms = [
  { id: 'bet9ja', name: 'Bet9ja', logo: bet9jaLogo, color: '#006400' },
  { id: 'sportybet', name: 'SportyBet', logo: sportybetLogo, color: '#F44336' },
  { id: 'betking', name: 'BetKing', logo: betkingLogo, color: '#FF6F00' },
  { id: 'nairabet', name: 'NairaBet', logo: nairabetLogo, color: '#1565C0' },
  { id: '1xbet', name: '1xBet', logo: onexbetLogo, color: '#0D47A1' },
  { id: 'merrybet', name: 'MerryBet', logo: merrybetLogo, color: '#4CAF50' },
];

export const mockTransactions = [
  { id: 'TXN001', type: 'Airtime', service: 'MTN', amount: 500, phone: '08031234567', status: 'success', date: '2026-09-07 14:32' },
  { id: 'TXN002', type: 'Data', service: 'Airtel - 2GB', amount: 1500, phone: '08031234567', status: 'success', date: '2026-09-06 10:15' },
  { id: 'TXN003', type: 'Electricity', service: 'Ikeja Electric', amount: 5000, meter: '45678901234', status: 'success', date: '2026-09-05 09:20' },
  { id: 'TXN004', type: 'TV', service: 'DStv Compact', amount: 9000, iuc: '7012345678', status: 'success', date: '2026-09-04 16:45' },
  { id: 'TXN005', type: 'Gift Card', service: 'Amazon US', amount: 3200, status: 'pending', date: '2026-09-03 11:30' },
  { id: 'TXN006', type: 'Betting', service: 'Bet9ja', amount: 2000, status: 'success', date: '2026-09-02 08:10' },
  { id: 'TXN007', type: 'Wallet', service: 'Wallet Funding', amount: 10000, status: 'success', date: '2026-09-01 12:00' },
];
