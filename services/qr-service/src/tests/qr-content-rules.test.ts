import { QRContentRulesService, ScanContext } from '../src/services/qr-content-rules.service';
import { QRContentRulesRepository } from '../src/repositories/qr-content-rules.repository';
import { Logger } from '../src/services/logger.service';
import { QRCode } from '../src/interfaces';

// Mock the repository
jest.mock('../src/repositories/qr-content-rules.repository');

describe('QRContentRulesService', () => {
  let service: QRContentRulesService;
  let mockRepository: jest.Mocked<QRContentRulesRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockRepository = new QRContentRulesRepository(null as any, null as any) as jest.Mocked<QRContentRulesRepository>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<Logger>;

    service = new QRContentRulesService(mockRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContentRule', () => {
    it('should create a device-specific rule successfully', async () => {
      // Arrange
      const qrCodeId = 'qr-123';
      const ruleData = {
        rule_name: 'Mobile Users',
        rule_type: 'device' as const,
        rule_data: {
          device_type: 'mobile'
        },
        content_type: 'url' as const,
        content_value: 'https://mobile.example.com',
        priority: 10
      };

      const expectedRule = {
        id: 'rule-123',
        qr_code_id: qrCodeId,
        rule_name: 'Mobile Users',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://mobile.example.com',
        priority: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.countRulesByQRCodeId.mockResolvedValue(0);
      mockRepository.createRule.mockResolvedValue(expectedRule);

      // Act
      const result = await service.createContentRule(qrCodeId, ruleData, 'pro');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedRule);
      expect(mockRepository.createRule).toHaveBeenCalledWith({
        qr_code_id: qrCodeId,
        rule_name: 'Mobile Users',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://mobile.example.com',
        priority: 10,
        is_active: true
      });
    });

    it('should reject rule creation when limit is exceeded for free tier', async () => {
      // Arrange
      const qrCodeId = 'qr-123';
      const ruleData = {
        rule_name: 'Test Rule',
        rule_type: 'device' as const,
        rule_data: { device_type: 'mobile' },
        content_type: 'url' as const,
        content_value: 'https://example.com'
      };

      mockRepository.countRulesByQRCodeId.mockResolvedValue(1); // Free tier limit is 1

      // Act
      const result = await service.createContentRule(qrCodeId, ruleData, 'free');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RULE_LIMIT_EXCEEDED');
      expect(result.error?.statusCode).toBe(403);
    });

    it('should validate rule data and reject invalid configurations', async () => {
      // Arrange
      const qrCodeId = 'qr-123';
      const invalidRuleData = {
        rule_name: '', // Invalid: empty name
        rule_type: 'invalid' as any, // Invalid: unsupported type
        rule_data: {},
        content_type: 'url' as const,
        content_value: '' // Invalid: empty content
      };

      // Act
      const result = await service.createContentRule(qrCodeId, invalidRuleData, 'free');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.statusCode).toBe(400);
    });
  });

  describe('resolveQRContent', () => {
    const mockQRCode: QRCode = {
      id: 'qr-123',
      userId: 'user-123',
      shortId: 'abc123',
      name: 'Test QR',
      type: 'url',
      content: { url: 'https://default.example.com' },
      design_config: {},
      targetUrl: 'https://default.example.com',
      is_active: true,
      current_scans: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return original content when no rules exist', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'UTC',
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          screen_size: { width: 375, height: 812 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://default.example.com');
      expect(result.data?.fallback_used).toBe(true);
      expect(result.data?.matched_rules).toHaveLength(0);
    });

    it('should resolve device-specific content for mobile users', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'UTC',
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          screen_size: { width: 375, height: 812 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const mobileRule = {
        id: 'rule-mobile',
        qr_code_id: 'qr-123',
        rule_name: 'Mobile Rule',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://mobile.example.com',
        priority: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([mobileRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://mobile.example.com');
      expect(result.data?.content_type).toBe('url');
      expect(result.data?.fallback_used).toBe(false);
      expect(result.data?.matched_rules).toHaveLength(1);
      expect(result.data?.matched_rules[0].rule_id).toBe('rule-mobile');
    });

    it('should resolve location-based content for specific countries', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'America/New_York',
        location: {
          country: 'US',
          region: 'California',
          city: 'San Francisco',
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        device: {
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
          screen_size: { width: 1920, height: 1080 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const locationRule = {
        id: 'rule-us',
        qr_code_id: 'qr-123',
        rule_name: 'US Users',
        rule_type: 'location',
        rule_data: { countries: ['US', 'CA'] },
        content_type: 'url',
        content_value: 'https://us.example.com',
        priority: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([locationRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://us.example.com');
      expect(result.data?.matched_rules[0].rule_id).toBe('rule-us');
    });

    it('should resolve time-based content during business hours', async () => {
      // Arrange
      const businessHoursTime = new Date();
      businessHoursTime.setUTCHours(14, 30, 0, 0); // 2:30 PM UTC

      const scanContext: ScanContext = {
        timestamp: businessHoursTime,
        timezone: 'UTC',
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          screen_size: { width: 375, height: 812 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const timeRule = {
        id: 'rule-business',
        qr_code_id: 'qr-123',
        rule_name: 'Business Hours',
        rule_type: 'time',
        rule_data: {
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: [1, 2, 3, 4, 5] // Monday to Friday
        },
        content_type: 'text',
        content_value: 'We are currently open! Call us now.',
        priority: 20,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([timeRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('We are currently open! Call us now.');
      expect(result.data?.content_type).toBe('text');
    });

    it('should resolve language-based content for Spanish users', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'UTC',
        device: {
          type: 'mobile',
          os: 'Android',
          browser: 'Chrome',
          screen_size: { width: 412, height: 915 }
        },
        language: {
          browser_languages: ['es-ES', 'es', 'en'],
          detected_language: 'es'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const languageRule = {
        id: 'rule-spanish',
        qr_code_id: 'qr-123',
        rule_name: 'Spanish Content',
        rule_type: 'language',
        rule_data: {
          supported_languages: ['es', 'es-ES', 'es-MX']
        },
        content_type: 'url',
        content_value: 'https://example.com/es',
        priority: 12,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([languageRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://example.com/es');
      expect(result.data?.matched_rules[0].rule_id).toBe('rule-spanish');
    });

    it('should prioritize higher priority rules when multiple rules match', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'UTC',
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          screen_size: { width: 375, height: 812 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const lowPriorityRule = {
        id: 'rule-low',
        qr_code_id: 'qr-123',
        rule_name: 'Low Priority',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://low-priority.example.com',
        priority: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const highPriorityRule = {
        id: 'rule-high',
        qr_code_id: 'qr-123',
        rule_name: 'High Priority',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://high-priority.example.com',
        priority: 20,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([lowPriorityRule, highPriorityRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://high-priority.example.com');
      expect(result.data?.matched_rules[0].rule_id).toBe('rule-high');
    });

    it('should use geographic coordinates for geo-fenced location rules', async () => {
      // Arrange
      const scanContext: ScanContext = {
        timestamp: new Date(),
        timezone: 'UTC',
        location: {
          country: 'US',
          region: 'California',
          city: 'San Francisco',
          coordinates: { lat: 37.7749, lng: -122.4194 } // Golden Gate Park area
        },
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          screen_size: { width: 375, height: 812 }
        },
        language: {
          browser_languages: ['en-US'],
          detected_language: 'en'
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const geoRule = {
        id: 'rule-geo',
        qr_code_id: 'qr-123',
        rule_name: 'Golden Gate Area',
        rule_type: 'location',
        rule_data: {
          coordinates: {
            latitude: 37.7749,
            longitude: -122.4194,
            radius_km: 2 // 2km radius
          }
        },
        content_type: 'url',
        content_value: 'https://golden-gate.example.com',
        priority: 25,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.findActiveRulesByQRCodeId.mockResolvedValue([geoRule]);

      // Act
      const result = await service.resolveQRContent(mockQRCode, scanContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.final_content).toBe('https://golden-gate.example.com');
      expect(result.data?.matched_rules[0].rule_id).toBe('rule-geo');
    });
  });

  describe('getQRContentRules', () => {
    it('should return all rules for a QR code', async () => {
      // Arrange
      const qrCodeId = 'qr-123';
      const mockRules = [
        {
          id: 'rule-1',
          qr_code_id: qrCodeId,
          rule_name: 'Mobile Rule',
          rule_type: 'device',
          rule_data: { device_type: 'mobile' },
          content_type: 'url',
          content_value: 'https://mobile.example.com',
          priority: 10,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockRepository.findByQRCodeId.mockResolvedValue(mockRules);

      // Act
      const result = await service.getQRContentRules(qrCodeId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRules);
      expect(mockRepository.findByQRCodeId).toHaveBeenCalledWith(qrCodeId);
    });
  });

  describe('updateContentRule', () => {
    it('should update an existing rule successfully', async () => {
      // Arrange
      const ruleId = 'rule-123';
      const updateData = {
        rule_name: 'Updated Mobile Rule',
        priority: 15
      };

      const updatedRule = {
        id: ruleId,
        qr_code_id: 'qr-123',
        rule_name: 'Updated Mobile Rule',
        rule_type: 'device',
        rule_data: { device_type: 'mobile' },
        content_type: 'url',
        content_value: 'https://mobile.example.com',
        priority: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.updateRule.mockResolvedValue(updatedRule);

      // Act
      const result = await service.updateContentRule(ruleId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedRule);
      expect(mockRepository.updateRule).toHaveBeenCalledWith(ruleId, updateData);
    });
  });

  describe('deleteContentRule', () => {
    it('should delete a rule successfully', async () => {
      // Arrange
      const ruleId = 'rule-123';
      mockRepository.deleteRule.mockResolvedValue(true);

      // Act
      const result = await service.deleteContentRule(ruleId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.deleteRule).toHaveBeenCalledWith(ruleId);
    });
  });
});

// Integration test helper to demonstrate real-world usage
describe('QRContentRulesService Integration Examples', () => {
  // These tests demonstrate how the Advanced QR Features would work in practice
  
  it('should demonstrate a complete restaurant menu scenario', async () => {
    // This test shows how a restaurant could use advanced QR features
    // for their menu QR codes based on time of day and device type
    
    const mockService = {
      // Morning menu (breakfast) for mobile users
      morningRule: {
        rule_name: 'Breakfast Menu - Mobile',
        rule_type: 'time' as const,
        rule_data: {
          start_time: '06:00',
          end_time: '11:00',
          days_of_week: [0, 1, 2, 3, 4, 5, 6] // All days
        },
        content_type: 'url' as const,
        content_value: 'https://restaurant.com/breakfast-mobile',
        priority: 20
      },
      
      // Lunch menu (midday)
      lunchRule: {
        rule_name: 'Lunch Menu',
        rule_type: 'time' as const,
        rule_data: {
          start_time: '11:00',
          end_time: '16:00'
        },
        content_type: 'url' as const,
        content_value: 'https://restaurant.com/lunch',
        priority: 15
      },
      
      // Dinner menu (evening)
      dinnerRule: {
        rule_name: 'Dinner Menu',
        rule_type: 'time' as const,
        rule_data: {
          start_time: '16:00',
          end_time: '23:00'
        },
        content_type: 'url' as const,
        content_value: 'https://restaurant.com/dinner',
        priority: 15
      }
    };

    // This demonstrates how the rules would be configured for a smart menu system
    expect(mockService.morningRule.rule_data.start_time).toBe('06:00');
    expect(mockService.lunchRule.content_value).toContain('lunch');
    expect(mockService.dinnerRule.priority).toBe(15);
  });

  it('should demonstrate an international business scenario', async () => {
    // This test shows how a global business could use location-based rules
    
    const mockBusinessRules = {
      // US customers see English content with USD pricing
      usRule: {
        rule_name: 'US Customers',
        rule_type: 'location' as const,
        rule_data: {
          countries: ['US'],
          regions: ['California', 'New York', 'Texas']
        },
        content_type: 'url' as const,
        content_value: 'https://business.com/us?currency=USD&lang=en',
        priority: 10
      },
      
      // EU customers see localized content with EUR pricing
      euRule: {
        rule_name: 'EU Customers',
        rule_type: 'location' as const,
        rule_data: {
          countries: ['DE', 'FR', 'IT', 'ES', 'NL']
        },
        content_type: 'url' as const,
        content_value: 'https://business.com/eu?currency=EUR&lang=local',
        priority: 10
      },
      
      // Mobile users get app download link
      mobileRule: {
        rule_name: 'Mobile App',
        rule_type: 'device' as const,
        rule_data: {
          device_type: 'mobile'
        },
        content_type: 'url' as const,
        content_value: 'https://business.com/app-download',
        priority: 25 // Higher priority than location rules
      }
    };

    // This shows how businesses can create sophisticated targeting
    expect(mockBusinessRules.mobileRule.priority).toBeGreaterThan(
      mockBusinessRules.usRule.priority
    );
  });
});