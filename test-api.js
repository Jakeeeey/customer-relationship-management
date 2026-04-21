fetch('http://localhost:3000/api/crm/customer-prospect?status=Pending&limit=1')
  .then(res => res.json())
  .then(data => {
    if (!data.prospects || data.prospects.length === 0) {
      console.log('No prospects found.');
      return;
    }
    const id = data.prospects[0].id;
    console.log('Prospect ID:', id);
    return fetch('http://localhost:3000/api/crm/customer-prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: "Approve" })
    });
  })
  .then(async res => {
    if (!res) return;
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  })
  .catch(console.error);
