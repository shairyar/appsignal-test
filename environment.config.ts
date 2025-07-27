// TODO: Seperate out environments for app and worker, worker doesn't require the same ENV, i.e. don't need marketplace redis vars
import { secretsService } from './secrets.service';
import { EnvironmentConfig } from './environment.d';

// Simple console logger to avoid circular dependency with main logger
const envLogger = {
    info: (message: string, meta?: any) => {
        console.log(`[ENV-CONFIG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    },
    error: (message: string, meta?: any) => {
        console.error(`[ENV-CONFIG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    },
};

class EnvironmentManager {
    private config: EnvironmentConfig | null = null;
    private node_env: string = 'development';
    private isInitialized = false;

    isProductionMode(): boolean {
        return this.node_env === 'production';
    }

    /**
     * Initialize the environment configuration
     * This should be called once at application startup
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.node_env = process.env.NODE_ENV || 'development';

        try {
            envLogger.info('Initializing environment configuration...');

            await this.loadSecrets();

            this.isInitialized = true;
            envLogger.info('Environment configuration initialized successfully');
        } catch (error) {
            envLogger.error('Failed to initialize environment configuration', {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            });
            process.exit(1);
        }
    }

    private async loadSecrets(): Promise<void> {
        const environment = this.node_env;
        if (this.isProductionMode()) {
            try {
                const [appSecretsRaw, dbSecretsRaw] = await Promise.all([
                    secretsService.getSecret(`mondayxero/${environment}/application`),
                    secretsService.getSecret(`mondayxero/${environment}/database`),
                ]);

                // Type guard to ensure we have objects
                const ensureObject = (secret: Record<string, string> | string, secretName: string): Record<string, string> => {
                    if (typeof secret === 'string') {
                        throw new Error(`Expected object for secret ${secretName}, but got string`);
                    }
                    return secret;
                };

                const appSecrets = ensureObject(appSecretsRaw, 'application');

                this.config = {
                    // App Configuration
                    PORT: process.env.PORT || '8080',
                    NODE_ENV: process.env.NODE_ENV || 'production',
                    APP_NAME: process.env.APP_NAME || 'MONDAY_XERO',
                    APP_URL: process.env.APP_URL || 'https://xero.mapps.upstreamtech.app',

                    // External Services
                    APPSIGNAL_PUSH_API_KEY: appSecrets.APPSIGNAL_PUSH_API_KEY,
                };
            } catch (error) {
                envLogger.error('Failed to load configuration from AWS Secrets Manager', {
                    error: {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                    },
                });
                throw error;
            }
        } else {
            this.config = {
                // App Configuration
                PORT: process.env.PORT || '8080',
                NODE_ENV: process.env.NODE_ENV || 'development',
                APP_NAME: process.env.APP_NAME || '',
                APP_URL: process.env.APP_URL || '',

                // External Services
                APPSIGNAL_PUSH_API_KEY: process.env.APPSIGNAL_PUSH_API_KEY || '',
            };
        }
        try {
            this.validateConfig();
        } catch (error) {
            envLogger.error('Failed to validate environment configuration', {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            });
            process.exit(1);
        }
    }

    /**
     * Validate that all required configuration values are present
     */
    private validateConfig(): void {
        if (!this.config) {
            throw new Error('Configuration not initialized');
        }

        const requiredFields: (keyof EnvironmentConfig)[] = ['APP_NAME', 'APP_URL'];

        const missingFields = requiredFields.filter((field) => !this.config![field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
        }
    }

    /**
     * Get a configuration value
     */
    get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
        if (!this.isInitialized || !this.config) {
            throw new Error('Environment configuration not initialized. Call initialize() first.');
        }
        return this.config[key];
    }

    isReady(): boolean {
        return this.isInitialized && this.config !== null;
    }
}

// Export singleton instance
export const environmentManager = new EnvironmentManager();
export default environmentManager;
