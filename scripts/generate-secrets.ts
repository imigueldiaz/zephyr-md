import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Generate a secure random JWT secret
const generateJwtSecret = (): string => {
    return crypto.randomBytes(64).toString('hex');
};

// Generate bcrypt hash for password
const generatePasswordHash = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const generateEnvFile = async (password: string) => {
    const jwtSecret = generateJwtSecret();
    const passwordHash = await generatePasswordHash(password);

    const envContent = `# JWT Configuration
JWT_SECRET=${jwtSecret}

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=${passwordHash}

# Note: Never commit this file to version control`;

    const envPath = join(process.cwd(), '.env');
    writeFileSync(envPath, envContent, 'utf8');
    console.log('Generated .env file with secure secrets');
    console.log('Make sure to never commit this file to version control!');
};

// Get password from command line argument
const password = process.argv[2];
if (!password) {
    console.error('Please provide a password as an argument');
    process.exit(1);
}

generateEnvFile(password).catch(console.error);
