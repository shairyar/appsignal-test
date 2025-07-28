import express, { Request, Response } from 'express';

const createRoutes = (logger: ReturnType<typeof import('./Logger').default>) => {
    const router = express.Router();

    router.use(express.json());

    router.get('/', (_req: Request, res: Response): void => {
        logger.info('Home page accessed');
        logger.info("Log message line");
        logger.debug("This is a debug message");
        res.status(200).send({ message: `You have reached the home page` });
    });

    return router;
};

export default createRoutes;
