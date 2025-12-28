import bcrypt from 'bcryptjs';

const PIN_SALT_ROUNDS = 10;

/**
 * Validates the format of a PIN.
 * Must be 4 to 6 digits.
 */
export function validatePinFormat(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
}

/**
 * Hashes a PIN using bcrypt.
 * Use this before saving to the database.
 */
export async function hashPin(pin: string): Promise<string> {
    if (!validatePinFormat(pin)) {
        throw new Error('Invalid PIN format. Must be 4-6 digits.');
    }
    return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

/**
 * Verifies a plaintext PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
}
