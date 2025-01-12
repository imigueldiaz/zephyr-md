import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

class Logger {
    private static instance: Logger;
    private logStream: WriteStream;
    private originalConsole: typeof console;

    private constructor() {
        const logFile = join(__dirname, '../logs/app.log');
        this.logStream = createWriteStream(logFile, { flags: 'a' });
        this.originalConsole = { ...console };

        // Sobrescribir los métodos de console
        console.log = (...args: any[]) => this.log('LOG', ...args);
        console.error = (...args: any[]) => this.log('ERROR', ...args);
        console.warn = (...args: any[]) => this.log('WARN', ...args);
        console.info = (...args: any[]) => this.log('INFO', ...args);
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private log(level: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        const logMessage = `[${timestamp}] ${level}: ${message}\n`;
        
        // Escribir al archivo
        this.logStream.write(logMessage);
        
        // También mostrar en la consola original
        switch(level) {
            case 'ERROR':
                this.originalConsole.error(message);
                break;
            case 'WARN':
                this.originalConsole.warn(message);
                break;
            case 'INFO':
                this.originalConsole.info(message);
                break;
            default:
                this.originalConsole.log(message);
        }
    }

    public info(...args: any[]): void {
        this.log('INFO', ...args);
    }

    public error(...args: any[]): void {
        this.log('ERROR', ...args);
    }

    public warn(...args: any[]): void {
        this.log('WARN', ...args);
    }

    public debug(...args: any[]): void {
        this.log('DEBUG', ...args);
    }

    close(): void {
        this.logStream.end();
    }
}

export const logger = Logger.getInstance();
