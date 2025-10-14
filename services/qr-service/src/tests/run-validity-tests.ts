#!/usr/bin/env ts-node

import { ValiditySystemTest } from './validity-system.test';

/**
 * Test runner for QR Validity & Expiration System
 * 
 * Usage:
 *   npm run test:validity
 *   or
 *   npx ts-node src/tests/run-validity-tests.ts
 */
async function main() {
  console.log('🚀 QR Validity & Expiration System Test Suite');
  console.log('===============================================');
  
  const test = new ValiditySystemTest();
  
  try {
    await test.runAllTests();
    console.log('🎯 Test Results: All systems operational!');
    console.log('\n🔄 Next Steps:');
    console.log('  1. Start QR Service: npm run dev (in qr-service directory)');
    console.log('  2. Start API Gateway: npm run dev (in api-gateway directory)');
    console.log('  3. Test endpoints: http://localhost:3000/api-docs');
    console.log('  4. Create QR with validity: POST /api/qr/generate');
    console.log('  5. Test scan tracking: GET /r/:shortId');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}