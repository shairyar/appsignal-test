import express, { Request, Response } from 'express';
import logger from './Logger';
const router = express.Router();

router.use(express.json());

router.get('/', (_req: Request, res: Response): void => {
    logger.info('Home page accessed');
    res.status(200).send({ message: `You have reached the home page` });
});

export default router;
