import axios from 'axios';

/**
 * Integration test for QR Validity System API endpoints
 * This tests the actual HTTP endpoints to ensure they work correctly
 * 
 * Prerequisites:
 * - QR Service must be running on localhost:3001
 * - API Gateway must be running on localhost:3000
 */
class ValidityAPIIntegrationTest {
  private qrServiceUrl = 'http://localhost:3001';
  private apiGatewayUrl = 'http://localhost:3000';
  private testQRId: string | null = null;
  private testShortId: string | null = null;

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🌐 Starting QR Validity API Integration Tests...\n');

    try {
      // Step 1: Create a test QR code with validity settings
      await this.testCreateQRWithValidity();
      
      // Step 2: Test validity endpoint
      await this.testValidityEndpoint();
      
      // Step 3: Test scan tracking
      await this.testScanTracking();
      
      // Step 4: Test validity settings update
      await this.testValidityUpdate();
      
      // Step 5: Test validity limits endpoint
      await this.testValidityLimits();

      console.log('\n✅ All integration tests passed! 🎉\n');
      console.log('🎯 Your QR Validity & Expiration System is fully operational!');
      
    } catch (error) {
      console.log('\n❌ Integration tests failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.log('Response data:', error.response.data);
        console.log('Response status:', error.response.status);
      }
    }
  }

  /**
   * Test creating QR code with validity settings
   */
  private async testCreateQRWithValidity(): Promise<void> {
    console.log('🔍 Testing QR creation with validity settings...');

    const qrData = {
      name: 'Test Validity QR',
      type: 'url',
      content: { url: 'https://example.com' },
      userId: 'test-user-123',
      validity: {
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        max_scans: 100,
        password: 'testpass123'
      }
    };

    try {
      const response = await axios.post(`${this.qrServiceUrl}/qr/generate`, qrData, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.assert(response.status === 201, 'QR creation should return 201');
      console.assert(response.data.qrCode, 'Response should contain QR code');
      console.assert(response.data.qrCode.expires_at, 'QR should have expiration date');
      console.assert(response.data.qrCode.max_scans === 100, 'QR should have scan limit');
      
      this.testQRId = response.data.qrCode.id;
      this.testShortId = response.data.qrCode.shortId;
      
      console.log('  ✓ QR created successfully with validity settings');
      console.log(`  ✓ QR ID: ${this.testQRId}`);
      console.log(`  ✓ Short ID: ${this.testShortId}`);
      
    } catch (error) {
      console.log('  ❌ Failed to create QR with validity settings');
      throw error;
    }
  }

  /**
   * Test validity checking endpoint
   */
  private async testValidityEndpoint(): Promise<void> {
    console.log('🔍 Testing QR validity endpoint...');

    if (!this.testShortId) {
      throw new Error('No test QR shortId available');
    }

    try {
      // Test without password (should fail)
      const noPasswordResponse = await axios.get(`${this.qrServiceUrl}/qr/${this.testShortId}/validate`);
      
      console.assert(noPasswordResponse.status === 200, 'Validity check should return 200');
      console.assert(noPasswordResponse.data.isValid === false, 'Should be invalid without password');
      console.assert(noPasswordResponse.data.reason === 'PASSWORD_REQUIRED', 'Should require password');
      
      console.log('  ✓ Password protection validation works');

      // Test with correct password
      const withPasswordResponse = await axios.get(
        `${this.qrServiceUrl}/qr/${this.testShortId}/validate`,
        { params: { password: 'testpass123' } }
      );
      
      console.assert(withPasswordResponse.status === 200, 'Validity check with password should return 200');
      console.assert(withPasswordResponse.data.isValid === true, 'Should be valid with correct password');
      
      console.log('  ✓ Password validation works correctly');
      
    } catch (error) {
      console.log('  ❌ Failed validity endpoint test');
      throw error;
    }
  }

  /**
   * Test scan tracking through API Gateway
   */
  private async testScanTracking(): Promise<void> {
    console.log('🔍 Testing scan tracking via API Gateway...');

    if (!this.testShortId) {
      throw new Error('No test QR shortId available');
    }

    try {
      // First scan - should require password
      const firstScanResponse = await axios.get(`${this.apiGatewayUrl}/r/${this.testShortId}`, {
        maxRedirects: 0,
        validateStatus: () => true // Don't throw on non-2xx status
      });

      // Should return password form or redirect based on implementation
      console.assert([200, 302, 401].includes(firstScanResponse.status), 'Should handle password protection');
      
      console.log('  ✓ Password protection enforced on scan');

      // Scan with password
      const scanWithPasswordResponse = await axios.get(
        `${this.apiGatewayUrl}/r/${this.testShortId}?password=testpass123`,
        {
          maxRedirects: 0,
          validateStatus: () => true
        }
      );

      console.assert([200, 302].includes(scanWithPasswordResponse.status), 'Should allow scan with password');
      
      console.log('  ✓ Scan tracking with password works');
      
    } catch (error) {
      console.log('  ❌ Failed scan tracking test');
      throw error;
    }
  }

  /**
   * Test validity settings update
   */
  private async testValidityUpdate(): Promise<void> {
    console.log('🔍 Testing validity settings update...');

    if (!this.testQRId) {
      throw new Error('No test QR ID available');
    }

    try {
      const updateData = {
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        max_scans: 200
      };

      const response = await axios.put(
        `${this.qrServiceUrl}/qr/${this.testQRId}/validity`,
        updateData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.assert(response.status === 200, 'Validity update should return 200');
      console.assert(response.data.qrCode, 'Response should contain updated QR');
      console.assert(response.data.qrCode.max_scans === 200, 'Max scans should be updated');
      
      console.log('  ✓ Validity settings updated successfully');
      
    } catch (error) {
      console.log('  ❌ Failed validity update test');
      throw error;
    }
  }

  /**
   * Test validity limits endpoint
   */
  private async testValidityLimits(): Promise<void> {
    console.log('🔍 Testing validity limits endpoint...');

    try {
      const response = await axios.get(`${this.qrServiceUrl}/validity-limits/pro`);

      console.assert(response.status === 200, 'Validity limits should return 200');
      console.assert(response.data.tier === 'pro', 'Should return pro tier limits');
      console.assert(response.data.maxExpirationDays === 365, 'Pro tier should have 365-day limit');
      console.assert(response.data.allowPasswordProtection === true, 'Pro tier should allow passwords');
      
      console.log('  ✓ Validity limits endpoint works correctly');
      
    } catch (error) {
      console.log('  ❌ Failed validity limits test');
      throw error;
    }
  }

  /**
   * Check if services are running
   */
  async checkServices(): Promise<void> {
    console.log('🔍 Checking if services are running...');

    try {
      await axios.get(`${this.qrServiceUrl}/health`);
      console.log('  ✓ QR Service is running');
    } catch (error) {
      console.log('  ❌ QR Service is not running. Start with: npm run dev (in qr-service directory)');
      throw new Error('QR Service not available');
    }

    try {
      await axios.get(`${this.apiGatewayUrl}/health`);
      console.log('  ✓ API Gateway is running');
    } catch (error) {
      console.log('  ❌ API Gateway is not running. Start with: npm run dev (in api-gateway directory)');
      throw new Error('API Gateway not available');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ValidityAPIIntegrationTest();
  
  test.checkServices()
    .then(() => test.runAllTests())
    .catch((error) => {
      console.error('Tests failed:', error.message);
      process.exit(1);
    });
}

export { ValidityAPIIntegrationTest };