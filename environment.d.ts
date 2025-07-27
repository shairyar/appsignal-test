export interface EnvironmentConfig {
    // App Configuration
    PORT: string;
    NODE_ENV: string;
    APP_NAME: string;
    APP_URL: string;

    // External Services
    APPSIGNAL_PUSH_API_KEY: string;
}
