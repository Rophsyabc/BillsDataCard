import 'dotenv/config';
import { generateToken } from '../server/middleware/auth.js';

const API_URL = 'http://localhost:4000';

const userToken = generateToken({ id: 'USR-279bacf5', email: 'nathanielrop84@gmail.com', name: 'Ayebiagbara opeyemi' });
const adminToken = generateToken({ id: 'USR-e89752e0', email: 'demo@google.com', name: 'Google User' });

const dummyImage = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-image-bytes-for-testing-kyc-photo').toString('base64');

async function runTests() {
  console.log('--- Test 1: GET /api/kyc/status ---');
  const res1 = await fetch(`${API_URL}/api/kyc/status`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const data1 = await res1.json();
  console.log('Status result:', data1.success, 'status:', data1.data?.status);

  console.log('\n--- Test 2: Validation on POST /api/kyc/submit ---');
  // Incomplete NIN
  const res2a = await fetch(`${API_URL}/api/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ ninNumber: '123' })
  });
  const data2a = await res2a.json();
  console.log('Invalid NIN caught:', !data2a.success, data2a.message);

  // Mismatched name
  const res2b = await fetch(`${API_URL}/api/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      ninNumber: '12345678901',
      nameOnNin: 'John Doe Somebody Else',
      ninSlipImage: dummyImage,
      livePhoto: dummyImage,
    })
  });
  const data2b = await res2b.json();
  console.log('Mismatched name caught:', !data2b.success, data2b.message);

  console.log('\n--- Test 3: Successful POST /api/kyc/submit with photoSource=camera ---');
  const res3 = await fetch(`${API_URL}/api/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      ninNumber: '12345678901',
      nameOnNin: 'Ayebiagbara opeyemi',
      ninSlipImage: dummyImage,
      livePhoto: dummyImage,
      photoSource: 'camera',
      additionalInfo: 'Automated test submission'
    })
  });
  const data3 = await res3.json();
  console.log('Submission result:', data3.success, data3.message, data3.data);

  if (data3.success) {
    const jobId = data3.data.jobId;
    console.log('\n--- Test 4: Verify Job Record and photoSource ---');
    const res4 = await fetch(`${API_URL}/api/kyc/job/${jobId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const data4 = await res4.json();
    console.log('Job photoSource:', data4.data?.photoSource, 'equals camera?', data4.data?.photoSource === 'camera');

    console.log('\n--- Test 5: Admin pending list includes photoSource ---');
    const res5 = await fetch(`${API_URL}/api/kyc/admin/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data5 = await res5.json();
    const foundJob = data5.data?.find(j => j.id === jobId);
    console.log('Found in admin list:', !!foundJob, 'photoSource:', foundJob?.photoSource);

    console.log('\n--- Test 6: Admin review approve ---');
    const res6 = await fetch(`${API_URL}/api/kyc/admin/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ jobId, action: 'approve', note: 'Approved in test' })
    });
    const data6 = await res6.json();
    console.log('Admin approved result:', data6.success, data6.message);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
