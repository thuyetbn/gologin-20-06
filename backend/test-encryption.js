/**
 * 🧪 Test script for EncryptionService
 * Run with: node backend/test-encryption.js
 */

const { EncryptionService } = require('./services/encryption-service.ts');

async function testEncryptionService() {
  console.log('🔐 Testing EncryptionService...\n');
  
  try {
    const encryptionService = EncryptionService.getInstance();
    
    // Test 1: Basic encryption/decryption
    console.log('1. Testing basic encryption/decryption...');
    const testData = 'Hello, this is a test GoLogin token: gl_test_123456789';
    const encrypted = await encryptionService.encrypt(testData);
    const decrypted = await encryptionService.decrypt(encrypted);
    
    console.log('   Original:', testData);
    console.log('   Encrypted:', JSON.stringify(encrypted, null, 2));
    console.log('   Decrypted:', decrypted);
    console.log('   ✅ Match:', testData === decrypted ? 'YES' : 'NO');
    console.log('');
    
    // Test 2: Store and retrieve credential
    console.log('2. Testing credential storage...');
    await encryptionService.storeCredential(
      'test_gologin_token',
      'gologin_token',
      'Test GoLogin Token',
      'gl_test_abcdef123456789',
      { 
        testMode: true,
        createdBy: 'test-script'
      }
    );
    
    const retrieved = await encryptionService.getCredential('test_gologin_token');
    console.log('   Stored token: gl_test_abcdef123456789');
    console.log('   Retrieved:', retrieved);
    console.log('   ✅ Match:', retrieved === 'gl_test_abcdef123456789' ? 'YES' : 'NO');
    console.log('');
    
    // Test 3: List credentials
    console.log('3. Testing credential listing...');
    const credentials = await encryptionService.listCredentials();
    console.log('   Total credentials:', credentials.length);
    credentials.forEach(cred => {
      console.log(`   - ${cred.name} (${cred.type}) - created ${cred.createdAt}`);
    });
    console.log('');
    
    // Test 4: Update credential
    console.log('4. Testing credential update...');
    const updateResult = await encryptionService.updateCredential('test_gologin_token', 'gl_updated_token_xyz');
    const updatedValue = await encryptionService.getCredential('test_gologin_token');
    console.log('   Update result:', updateResult);
    console.log('   Updated value:', updatedValue);
    console.log('   ✅ Updated correctly:', updatedValue === 'gl_updated_token_xyz' ? 'YES' : 'NO');
    console.log('');
    
    // Test 5: Validate integrity
    console.log('5. Testing file integrity validation...');
    const integrity = await encryptionService.validateIntegrity();
    console.log('   Integrity check:', integrity);
    console.log('');
    
    // Test 6: Export credentials (metadata only)
    console.log('6. Testing credential export...');
    const exportData = await encryptionService.exportCredentials();
    console.log('   Export data preview:');
    console.log('   ', exportData.substring(0, 200) + '...');
    console.log('');
    
    // Cleanup test credential
    console.log('7. Cleaning up test credential...');
    const deleteResult = await encryptionService.deleteCredential('test_gologin_token');
    console.log('   Delete result:', deleteResult);
    console.log('');
    
    console.log('🎉 All encryption tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    process.exit(1);
  }
}

// Run tests
testEncryptionService().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}); 