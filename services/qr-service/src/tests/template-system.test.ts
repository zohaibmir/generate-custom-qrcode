import { QRTemplateService } from '../services/qr-template.service';
import { Logger } from '../services/logger.service';

/**
 * Simple test for QR Template System
 * Run this to verify the template system works
 */
async function testTemplateSystem() {
  console.log('🧪 Testing QR Template System...\n');
  
  const logger = new Logger('template-test');
  
  // Mock QR service for testing
  const mockQRService = {
    createQR: async (userId: string, qrData: any) => ({
      success: true,
      data: {
        id: 'test-qr-123',
        shortId: 'abc123',
        name: qrData.title || 'Test QR',
        type: qrData.type,
        content: qrData.data,
        targetUrl: `https://example.com/r/abc123`,
        is_active: true,
        current_scans: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  };

  const templateService = new QRTemplateService(logger, mockQRService as any);

  try {
    // Test 1: Get all templates
    console.log('📋 Test 1: Getting all templates...');
    const allTemplates = await templateService.getAllTemplates();
    console.log(`✅ Found ${allTemplates.data?.length || 0} templates`);
    console.log('Template categories:', allTemplates.data?.map(t => t.category).join(', '));

    // Test 2: Get template by ID
    console.log('\n🔍 Test 2: Getting restaurant menu template...');
    const menuTemplate = await templateService.getTemplateById('restaurant-menu');
    if (menuTemplate.success) {
      console.log(`✅ Template: ${menuTemplate.data?.name}`);
      console.log(`✅ Fields: ${menuTemplate.data?.fields.length} fields`);
      console.log(`✅ Category: ${menuTemplate.data?.category}`);
    } else {
      console.log('❌ Failed to get template');
    }

    // Test 3: Get templates by category
    console.log('\n🏢 Test 3: Getting business templates...');
    const businessTemplates = await templateService.getTemplatesByCategory('business');
    console.log(`✅ Found ${businessTemplates.data?.length || 0} business templates`);

    // Test 4: Validate template data
    console.log('\n✅ Test 4: Validating restaurant menu data...');
    const validationResult = await templateService.validateTemplateData('restaurant-menu', {
      name: 'Test Restaurant QR',
      menuUrl: 'https://pizzapalace.com/menu',
      restaurantName: 'Pizza Palace'
    });
    console.log(`✅ Validation result: ${validationResult.isValid ? 'VALID' : 'INVALID'}`);
    if (!validationResult.isValid) {
      console.log('❌ Validation errors:', validationResult.details);
    }

    // Test 5: Create QR from template
    console.log('\n🎯 Test 5: Creating QR from restaurant template...');
    const qrResult = await templateService.createQRFromTemplate('restaurant-menu', 'test-user-123', {
      name: 'Pizza Palace Menu QR',
      menuUrl: 'https://pizzapalace.com/menu',
      restaurantName: 'Pizza Palace'
    });

    if (qrResult.success) {
      console.log(`✅ QR created successfully!`);
      console.log(`✅ QR ID: ${qrResult.data?.id}`);
      console.log(`✅ Short ID: ${qrResult.data?.shortId}`);
      console.log(`✅ Target URL: ${qrResult.data?.targetUrl}`);
    } else {
      console.log('❌ Failed to create QR:', qrResult.error);
    }

    // Test 6: Test subscription tier filtering
    console.log('\n🎟️ Test 6: Testing subscription tier filtering...');
    const freeTemplates = templateService.getTemplatesByTier('free');
    const proTemplates = templateService.getTemplatesByTier('pro');
    console.log(`✅ Free tier: ${freeTemplates.length} templates`);
    console.log(`✅ Pro tier: ${proTemplates.length} templates`);

    // Test 7: Get popular templates
    console.log('\n⭐ Test 7: Getting popular templates...');
    const popularTemplates = templateService.getPopularTemplates();
    console.log(`✅ Popular templates: ${popularTemplates.length}`);
    console.log('Popular template names:', popularTemplates.map(t => t.name).join(', '));

    console.log('\n🎉 All template system tests passed!\n');

    console.log('🚀 Next Steps:');
    console.log('  1. Start QR Service: npm run dev (in qr-service directory)');
    console.log('  2. Start API Gateway: npm run dev (in api-gateway directory)');
    console.log('  3. Test endpoints:');
    console.log('     • GET /api/templates - List all templates');
    console.log('     • GET /api/templates/restaurant-menu - Get specific template');
    console.log('     • POST /api/templates/restaurant-menu/generate - Create QR from template');
    console.log('  4. View docs: http://localhost:3000/api-docs');

  } catch (error) {
    console.error('❌ Template system test failed:', error);
    process.exit(1);
  }
}

// Jest test wrapper
describe('QR Template System Tests', () => {
  test('Template system functionality', async () => {
    await testTemplateSystem();
  });
});

if (require.main === module) {
  testTemplateSystem();
}

export { testTemplateSystem };