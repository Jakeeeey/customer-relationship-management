const token = 'rTilKSsclzuQW8WfQWK1ba8wrD_LetNn';
const listUrl = 'http://goatedcodoer:8056/items/customer_prospect?limit=1';

fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } })
  .then(res => res.json())
  .then(listData => {
    if (!listData.data || listData.data.length === 0) {
      console.log('No prospects found.');
      process.exit(0);
    }
    const prospect = listData.data[0];
    console.log('Found prospect ID:', prospect.id);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, prospect_status: _pStatus, prospect_date: _pDate, salesman_id: _sId, salesman_name: _sName, user_id, ...customerData } = prospect;
    console.log('Customer Data:', customerData);
    
    return fetch('http://goatedcodoer:8056/items/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...customerData, isActive: 1, user_id: user_id || null })
    });
  })
  .then(async res => {
    if (!res) return;
    console.log('Customer creation status:', res.status);
    console.log('Response:', await res.text());
  })
  .catch(err => console.error(err));

