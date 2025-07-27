import express, { Express } from 'express';
import { expressErrorHandler } from '@appsignal/nodejs';
import routes from './routes';
import logger from './Logger';

const createApp = (): Express => {
    const app: Express = express();

    return app;
};

const app = createApp();

app.use(routes);
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

export default app;
