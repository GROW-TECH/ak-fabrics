const http = require('http');

// First, let's create a test sale over 50k
const saleData = {
  customerId: 'test-customer-id',
  items: [
    {
      productId: 'test-product-id',
      hsn: '5401',
      size: 'Standard',
      description: 'Test Fabric',
      rate: 1000,
      qty: 60,
      total: 60000
    }
  ],
  grandTotal: 60000,
  paidAmount: 0,
  paymentMode: 'CREDIT',
  notes: 'Test sale for E-way bill'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sales',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 201) {
      console.log('Sale created successfully! Check if E-way bill was generated...');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(saleData));
req.end();
