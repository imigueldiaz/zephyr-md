import bcrypt from 'bcryptjs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

async function generatePassword() {
    try {
        // Get password from user input
        const password = await new Promise<string>((resolve) => {
            rl.question('Enter the password for the admin user: ', resolve);
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate a secure JWT secret
        const jwtSecret = require('crypto').randomBytes(64).toString('hex');

        // Read current config
        const configPath = join(__dirname, '../../config.json');
        const config = JSON.parse(await readFile(configPath, 'utf-8'));

        // Update config
        config.auth = {
            jwtSecret,
            jwtExpiresIn: '1h',
            users: [
                {
                    username: 'admin',
                    password: hashedPassword
                }
            ]
        };

        // Write updated config
        await writeFile(configPath, JSON.stringify(config, null, 4));

        console.log('Configuration updated successfully!');
        console.log('Admin password and JWT secret have been set.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        rl.close();
    }
}

generatePassword();
