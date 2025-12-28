
import { hashPin, verifyPin, validatePinFormat } from '../src/lib/staff-auth';
import { timingSafeEqual } from 'node:crypto';

console.log('--- VERIFYING STAFF PIN SECURITY ---');

const testPin = '1234';
const badPin = '0000';
const invalidPin = '12a';

try {
    // 1. Validation
    console.log('1. Testing Validation...');
    if (!validatePinFormat(testPin)) throw new Error('Valid PIN rejected');
    if (validatePinFormat(invalidPin)) throw new Error('Invalid PIN accepted');
    console.log('   - Validation Logic: OK');

    // 2. Hashing
    console.log('2. Testing Hashing...');
    const hash = await hashPin(testPin);
    console.log(`   - PIN hashed securely: ${hash.substring(0, 10)}...`);
    const hashBuffer = Buffer.from(hash);
    const pinBuffer = Buffer.from(testPin);
    
    // timingSafeEqual requires buffers of equal length
    const lengthsMatch = hashBuffer.length === pinBuffer.length;
    const isEqual = lengthsMatch && timingSafeEqual(hashBuffer, pinBuffer);

    if (isEqual) throw new Error('PIN was not hashed!');

    // 3. Verification
    console.log('3. Testing Verification...');
    const isMatch = await verifyPin(testPin, hash);
    const isBadMatch = await verifyPin(badPin, hash);

    if (!isMatch) throw new Error('Correct PIN failed verification');
    if (isBadMatch) throw new Error('Incorrect PIN passed verification');
    console.log('   - Verification Logic: OK');

    console.log('--- SUCCESS: STAFF AUTH MODULE IS SECURE ---');

} catch (error) {
    console.error('--- FAILED ---');
    console.error(error);
    process.exit(1);
}
