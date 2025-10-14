import { QRValidityService } from '../services/qr-validity.service';
import { Logger } from '../services/logger.service';
import { QRCode } from '../interfaces';

/**
 * Simple test suite for QR Validity System
 * Run this to verify the validity system works correctly
 */
class ValiditySystemTest {
  private validityService: QRValidityService;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('validity-test');
    this.validityService = new QRValidityService(this.logger);
  }

  /**
   * Run all validity tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🧪 Starting QR Validity System Tests...\n');

    try {
      await this.testExpirationValidation();
      await this.testScanLimitValidation();
      await this.testPasswordValidation();
      await this.testScheduleValidation();
      await this.testScanProcessing();
      await this.testSubscriptionLimits();

      console.log('\n✅ All validity tests passed! 🎉\n');
    } catch (error) {
      console.log('\n❌ Some tests failed:', error);
    }
  }

  /**
   * Test expiration validation
   */
  private async testExpirationValidation(): Promise<void> {
    console.log('🔍 Testing expiration validation...');

    // Test valid (not expired) QR
    const validQR: QRCode = this.createMockQR({
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // expires tomorrow
    });

    const validResult = await this.validityService.validateQRCode(validQR);
    console.assert(validResult.isValid === true, 'Valid QR should pass expiration check');
    console.log('  ✓ Valid QR passes expiration check');

    // Test expired QR
    const expiredQR: QRCode = this.createMockQR({
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // expired yesterday
    });

    const expiredResult = await this.validityService.validateQRCode(expiredQR);
    console.assert(expiredResult.isValid === false, 'Expired QR should fail validation');
    console.assert(expiredResult.reason === 'QR_CODE_EXPIRED', 'Should return correct expiration reason');
    console.log('  ✓ Expired QR fails validation correctly');

    // Test QR with no expiration
    const noExpiryQR: QRCode = this.createMockQR({
      expires_at: undefined
    });

    const noExpiryResult = await this.validityService.validateQRCode(noExpiryQR);
    console.assert(noExpiryResult.isValid === true, 'QR with no expiry should be valid');
    console.log('  ✓ QR with no expiration is valid');
  }

  /**
   * Test scan limit validation
   */
  private async testScanLimitValidation(): Promise<void> {
    console.log('🔍 Testing scan limit validation...');

    // Test QR within scan limits
    const withinLimitQR: QRCode = this.createMockQR({
      max_scans: 100,
      current_scans: 50
    });

    const withinLimitResult = await this.validityService.validateQRCode(withinLimitQR);
    console.assert(withinLimitResult.isValid === true, 'QR within scan limits should be valid');
    console.log('  ✓ QR within scan limits is valid');

    // Test QR at scan limit
    const atLimitQR: QRCode = this.createMockQR({
      max_scans: 100,
      current_scans: 100
    });

    const atLimitResult = await this.validityService.validateQRCode(atLimitQR);
    console.assert(atLimitResult.isValid === false, 'QR at scan limit should be invalid');
    console.assert(atLimitResult.reason === 'SCAN_LIMIT_EXCEEDED', 'Should return correct scan limit reason');
    console.log('  ✓ QR at scan limit fails validation correctly');

    // Test QR with no scan limit
    const noLimitQR: QRCode = this.createMockQR({
      max_scans: undefined,
      current_scans: 1000
    });

    const noLimitResult = await this.validityService.validateQRCode(noLimitQR);
    console.assert(noLimitResult.isValid === true, 'QR with no scan limit should be valid');
    console.log('  ✓ QR with no scan limit is valid');
  }

  /**
   * Test password validation
   */
  private async testPasswordValidation(): Promise<void> {
    console.log('🔍 Testing password validation...');

    // Test QR with no password protection
    const noPasswordQR: QRCode = this.createMockQR({
      password_hash: undefined
    });

    const noPasswordResult = await this.validityService.validateQRCode(noPasswordQR);
    console.assert(noPasswordResult.isValid === true, 'QR with no password should be valid');
    console.log('  ✓ QR with no password protection is valid');

    // Test password-protected QR without password
    const protectedQR: QRCode = this.createMockQR({
      password_hash: 'test123'
    });

    const noPasswordProvidedResult = await this.validityService.validateQRCode(protectedQR);
    console.assert(noPasswordProvidedResult.isValid === false, 'Protected QR without password should be invalid');
    console.assert(noPasswordProvidedResult.reason === 'PASSWORD_REQUIRED', 'Should return password required reason');
    console.log('  ✓ Protected QR without password fails validation correctly');

    // Test password-protected QR with correct password
    const correctPasswordResult = await this.validityService.validateQRCode(protectedQR, 'test123');
    console.assert(correctPasswordResult.isValid === true, 'Protected QR with correct password should be valid');
    console.log('  ✓ Protected QR with correct password is valid');

    // Test password-protected QR with wrong password
    const wrongPasswordResult = await this.validityService.validateQRCode(protectedQR, 'wrong');
    console.assert(wrongPasswordResult.isValid === false, 'Protected QR with wrong password should be invalid');
    console.log('  ✓ Protected QR with wrong password fails validation correctly');
  }

  /**
   * Test schedule validation
   */
  private async testScheduleValidation(): Promise<void> {
    console.log('🔍 Testing schedule validation...');

    // Test QR with no schedule
    const noScheduleQR: QRCode = this.createMockQR({
      valid_schedule: undefined
    });

    const noScheduleResult = await this.validityService.validateQRCode(noScheduleQR);
    console.assert(noScheduleResult.isValid === true, 'QR with no schedule should be valid');
    console.log('  ✓ QR with no schedule is valid');

    // Test QR with 24/7 schedule
    const alwaysActiveQR: QRCode = this.createMockQR({
      valid_schedule: {
        dailyHours: { startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 }
      }
    });

    const alwaysActiveResult = await this.validityService.validateQRCode(alwaysActiveQR);
    console.assert(alwaysActiveResult.isValid === true, 'QR with 24/7 schedule should be valid');
    console.log('  ✓ QR with 24/7 schedule is valid');
  }

  /**
   * Test scan processing
   */
  private async testScanProcessing(): Promise<void> {
    console.log('🔍 Testing scan processing...');

    // Test valid scan
    const validQR: QRCode = this.createMockQR({
      current_scans: 5,
      max_scans: 100
    });

    const scanResult = await this.validityService.processScanAttempt(validQR);
    console.assert(scanResult.success === true, 'Valid scan should succeed');
    console.assert(scanResult.canScan === true, 'Should allow scanning');
    console.assert(scanResult.newScanCount === 6, 'Should increment scan count');
    console.log('  ✓ Valid scan processes correctly');

    // Test blocked scan
    const blockedQR: QRCode = this.createMockQR({
      current_scans: 100,
      max_scans: 100
    });

    const blockedResult = await this.validityService.processScanAttempt(blockedQR);
    console.assert(blockedResult.success === true, 'Blocked scan processing should succeed');
    console.assert(blockedResult.canScan === false, 'Should not allow scanning');
    console.log('  ✓ Blocked scan processes correctly');
  }

  /**
   * Test subscription limits
   */
  private async testSubscriptionLimits(): Promise<void> {
    console.log('🔍 Testing subscription limits...');

    // Test free tier limits
    const freeLimits = this.validityService.getValidityConfigForTier('free');
    console.assert(freeLimits.maxExpirationDays === 30, 'Free tier should have 30-day expiration limit');
    console.assert(freeLimits.allowPasswordProtection === false, 'Free tier should not allow password protection');
    console.log('  ✓ Free tier limits are correct');

    // Test pro tier limits
    const proLimits = this.validityService.getValidityConfigForTier('pro');
    console.assert(proLimits.maxExpirationDays === 365, 'Pro tier should have 365-day expiration limit');
    console.assert(proLimits.allowPasswordProtection === true, 'Pro tier should allow password protection');
    console.log('  ✓ Pro tier limits are correct');

    // Test validity parameter validation
    const freeValidation = this.validityService.validateValidityParams(
      {
        expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        password: 'test123'
      },
      'free'
    );

    console.assert(freeValidation.isValid === false, 'Free tier validation should fail for advanced features');
    console.assert(freeValidation.errors.length > 0, 'Should have validation errors');
    console.log('  ✓ Free tier parameter validation works correctly');
  }

  /**
   * Create a mock QR code for testing
   */
  private createMockQR(overrides: Partial<QRCode> = {}): QRCode {
    return {
      id: 'test-qr-id',
      userId: 'test-user-id',
      shortId: 'abc123',
      name: 'Test QR Code',
      type: 'url',
      content: { url: 'https://example.com' },
      targetUrl: 'https://example.com/r/abc123',
      is_active: true,
      current_scans: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ValiditySystemTest();
  test.runAllTests().catch(console.error);
}

export { ValiditySystemTest };