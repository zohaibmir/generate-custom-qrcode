import { JwtTokenService } from '../src/auth/services/jwt-token.service';

const service = new JwtTokenService('test-secret-key-with-sufficient-length-for-security', 'test-issuer');

// Test empty token
service.verifyToken('').catch(error => {
  console.log('Empty token error:', error.code, error.message);
});

// Test null token  
service.verifyToken(null as any).catch(error => {
  console.log('Null token error:', error.code, error.message);
});

// Test Bearer empty token
service.verifyToken('Bearer ').catch(error => {
  console.log('Bearer empty error:', error.code, error.message);
});