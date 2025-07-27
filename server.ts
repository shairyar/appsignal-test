import dotenv from 'dotenv';
dotenv.config();

import environmentManager from './environment.config';
import { Appsignal } from '@appsignal/nodejs';

const startServer = async () => {
    let logger: typeof import('./Logger').default | undefined;
    try {
        // Initialize environment configuration FIRST
        await environmentManager.initialize();

        new Appsignal({
            active: true,
            name: 'APPSIGNAL_TEST',
            pushApiKey: environmentManager.get('APPSIGNAL_PUSH_API_KEY'),
            revision: process.env.APP_VERSION,
            environment: environmentManager.get('NODE_ENV'),
        });

        const { default: app } = await import('./app');
        logger = (await import('./Logger')).default;

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
