import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import createLogger from './Logger';

// Lazy-loaded logger to avoid creating it before AppSignal is initialized
let logger: ReturnType<typeof createLogger> | null = null;
const getLogger = () => {
    if (!logger) {
        logger = createLogger();
    }
    return logger;
};
interface SecretsCache {
    [secretName: string]: {
        value: Record<string, string> | string;
        timestamp: number;
    };
}

class SecretsService {
    private client: SecretsManagerClient | undefined;
    private cache: SecretsCache = {};
    private readonly CACHE_TTL = parseInt(process.env.SECRETS_CACHE_TTL || '86400000'); // Default 24 hours in ms
    private node_env: string = 'development';

    constructor(env: string) {
        this.node_env = env;

        if (this.node_env === 'production') {
            // In production, use AWS credentials from IAM role or environment
            this.client = new SecretsManagerClient({
                region: 'ap-southeast-2',
            });
        }
    }

    /**
     * Get all values from a secret as an object
     * In development, maps secret names to corresponding environment variables
     * In production, retrieves the actual secret object from AWS Secrets Manager
     */
    async getSecret(secretName: string): Promise<Record<string, string> | string> {
        if (!this.isProduction) {
            throw new Error('getSecret is only supported in production');
        }

        if (!this.client) {
            throw new Error('SecretsManagerClient is not initialized');
        }

        const cacheKey = secretName;
        const now = Date.now();

        // Check cache first
        if (this.cache[cacheKey] && now - this.cache[cacheKey].timestamp < this.CACHE_TTL) {
            return this.cache[cacheKey].value;
        }

        try {
            const command = new GetSecretValueCommand({
                SecretId: secretName,
            });

            const response = await this.client.send(command);

            if (!response.SecretString) {
                throw new Error(`Secret ${secretName} has no SecretString value`);
            }

            let secretValue: Record<string, string> | string;
            try {
                const parsed = JSON.parse(response.SecretString);

                // Validate that the parsed value is an object (for key-value secrets)
                if (typeof parsed !== 'object' || parsed === null) {
                    getLogger().warn(`Secret ${secretName} is not a JSON object, treating as string value`);
                    secretValue = response.SecretString;
                } else {
                    // Ensure all values in the object are strings
                    secretValue = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, typeof value === 'string' ? value : String(value)]));
                }
            } catch (parseError) {
                getLogger().error(`Failed to parse JSON for secret ${secretName}`, {
                    error: {
                        message: parseError instanceof Error ? parseError.message : String(parseError),
                        secretLength: response.SecretString.length, // Log length instead of content
                    },
                });
                throw new Error(`Secret ${secretName} contains invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }

            // Cache the result
            this.cache[cacheKey] = {
                value: secretValue,
                timestamp: now,
            };

            getLogger().info(`Successfully retrieved secret: ${secretName}`);
            return secretValue;
        } catch (error) {
            getLogger().error(`Failed to retrieve secret ${secretName}`, {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            });
            throw error;
        }
    }

    private get isProduction(): boolean {
        return this.node_env === 'production';
    }
}

// Export singleton instance
export const secretsService = new SecretsService(process.env.NODE_ENV || 'development');
export default secretsService;
