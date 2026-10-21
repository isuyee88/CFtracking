import fetch from 'node-fetch';

async function measureConversionPerformance() {
  const url = 'http://localhost:5174/conversions';
  console.log(`Testing URL: ${url}`);

  // Measure response time
  const startTime = Date.now();
  try {
    const response = await fetch(url);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    console.log(`Response time: ${responseTime}ms`);
    console.log(`Status code: ${response.status}`);

    // Try to read a small portion of the response body
    const body = await response.text();
    console.log(`Response body length: ${body.length} characters`);
    
    if (responseTime > 2000) {
      console.log('⚠️  Performance warning: Response took longer than 2 seconds');
    } else {
      console.log('✅ Performance: Response was under 2 seconds');
    }
  } catch (error) {
    console.error('Error fetching conversions:', error);
  }
}

measureConversionPerformance();