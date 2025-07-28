import express, { Express } from 'express';
import { expressErrorHandler } from '@appsignal/nodejs';
import createRoutes from './routes';

const createApp = (logger: ReturnType<typeof import('./Logger').default>): Express => {
    const app: Express = express();

    app.use(createRoutes(logger));
    app.use(expressErrorHandler());

    // Create a catch all error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error(`An error occurred: ${err.message}`, {
            error: {
                message: err.message,
                stack: err.stack,
            },
        });
        res.status(500).send('Something went wrong');
        return;
    });

    return app;
};

export { createApp };
export default createApp;
