import { WinstonTransport } from '@appsignal/nodejs';
import winston from 'winston';

let logger: winston.Logger | null = null;

const resetLogger = (): void => {
    logger = null;
};

const createLogger = (): winston.Logger => {
    if (logger) {
        return logger;
    }

    const transports: winston.transport[] = [];
    
    try {
        const appsignalTransport = new WinstonTransport({ 
            group: 'app',
            level: 'debug'
        });
        
        transports.push(appsignalTransport);
    } catch (error) {
        console.error('❌ Failed to create AppSignal Winston transport:', error);
    }

    transports.push(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );

    logger = winston.createLogger({
        level: 'debug',
        transports,
        format: winston.format.combine(
            // remove shortLivedToken from logs
            winston.format((info) => {
                // Recurse over the info object and flatten everything to a single level
                // Remove shortLivedToken from logs
                interface LogObject {
                    [key: string]: any;
                }

                const flatten = (obj: LogObject, prefix: string = ''): LogObject =>
                    Object.keys(obj).reduce((acc: LogObject, k: string): LogObject => {
                        const pre = prefix.length ? `${prefix}.` : '';
                        if (k === 'shortLivedToken' || k === 'mondayAccessToken' || k === 'accessToken' || k === 'encryptedData') {
                            acc[`${pre}${k}`] = 'REDACTED';
                        } else if (typeof obj[k] === 'object' && obj[k] !== null) {
                            Object.assign(acc, flatten(obj[k], `${pre}${k}`));
                        } else {
                            acc[`${pre}${k}`] = obj[k];
                        }
                        delete info[k];
                        return acc;
                    }, {});

                const flattenedInfo = flatten(info);
                Object.assign(info, flattenedInfo);

                return info;
            })(),
            winston.format.json()
        ),
    });

    logger.info(`logger - running`);
    return logger;
};

export { resetLogger };
export default createLogger;
