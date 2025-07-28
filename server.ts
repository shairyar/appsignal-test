import dotenv from 'dotenv';
dotenv.config();

import environmentManager from './environment.config';
import { Appsignal } from '@appsignal/nodejs';

const startServer = async () => {
    let logger: ReturnType<typeof import('./Logger').default> | undefined;
    try {
        // Initialize environment configuration FIRST
        await environmentManager.initialize();

        const pushApiKey = environmentManager.get('APPSIGNAL_PUSH_API_KEY');
        const nodeEnv = environmentManager.get('NODE_ENV');

        const appsignal = new Appsignal({
            active: true,
            name: 'APPSIGNAL_TEST',
            pushApiKey: pushApiKey,
            revision: process.env.APP_VERSION,
            environment: nodeEnv,
            logLevel: 'debug',
            logPath: './logs',
        });

        // Create logger AFTER AppSignal is initialized
        const createLogger = (await import('./Logger')).default;
        const { resetLogger } = await import('./Logger');
        
        // Reset any previous logger instance and create fresh one
        resetLogger();
        logger = createLogger();

        const { createApp } = await import('./app');
        const app = createApp(logger);

        const port = environmentManager.get('PORT');
        const appName = environmentManager.get('APP_NAME');

        app.listen(port, () => {
            logger!.info(`${appName} listening on:${port} in ${environmentManager.get('NODE_ENV')}`);
        });
    } catch (error) {
        if (logger) {
            logger.error('Failed to start server', {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            });
        } else {
            console.error('Failed to start server', {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            });
        }
        process.exit(1);
    }
};

startServer();
