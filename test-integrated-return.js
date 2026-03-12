const http = require('http');

// Test integrated sales return API
const testData = {
  sale_id: 'test-sale-id',
  items: [
    {
      product_id: 'test-product-id',
      quantity: 3
    }
  ],
  return_reason: 'Items returned by customer'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sales/return',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
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
      console.log('✅ Sales return integrated successfully!');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(testData));
req.end();
