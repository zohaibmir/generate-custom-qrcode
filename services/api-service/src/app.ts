import { Pool } from 'pg';
import { DependencyContainerService } from './services/dependency-container.service';
import { ExpressApp } from './express-app';

export class App {
    private container: DependencyContainerService;
    private expressApp!: ExpressApp;

    constructor() {
        this.container = DependencyContainerService.getInstance();
    }

    public async bootstrap(): Promise<void> {
        try {
            console.log('[App] Starting API Service bootstrap...');
            
            // Initialize database connection
            await this.initializeDatabase();
            
            // Register core services
            await this.registerServices();
            
            // Initialize Express app
            this.expressApp = new ExpressApp();
            
            console.log('[App] API Service bootstrap completed successfully');
        } catch (error) {
            console.error('[App] Bootstrap failed:', error);
            throw error;
        }
    }

    private async initializeDatabase(): Promise<void> {
        try {
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'qr_saas',
                user: process.env.DB_USER || 'qr_user',
                password: process.env.DB_PASSWORD || 'qr_password',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000
            };

            const pool = new Pool(dbConfig);
            
            // Test connection
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            // Register database pool in container
            this.container.register('DatabasePool', pool);
            console.log('[App] Database connection established');
        } catch (error) {
            console.error('[App] Database connection failed:', error);
            throw error;
        }
    }

    private async registerServices(): Promise<void> {
        const dbPool = this.container.resolve<Pool>('DatabasePool');

        // Register repositories
        const apiKeyRepository = new (await import('./repositories/api-key.repository')).ApiKeyRepository(dbPool);
        const webhookRepository = new (await import('./repositories/webhook.repository')).WebhookRepository(dbPool);
        const sdkRepository = new (await import('./repositories/sdk.repository')).SdkRepository(dbPool);
        
        this.container.register('ApiKeyRepository', apiKeyRepository);
        this.container.register('WebhookRepository', webhookRepository);
        this.container.register('SdkRepository', sdkRepository);

        // Register services
        const apiKeyService = new (await import('./services/api-key.service')).ApiKeyService(apiKeyRepository);
        const webhookService = new (await import('./services/webhook.service')).WebhookService(webhookRepository);
        const webhookJobService = new (await import('./services/webhook-job.service')).WebhookJobService(webhookService, webhookRepository);
        const sdkService = new (await import('./services/sdk.service')).SdkService(sdkRepository);
        
        this.container.register('ApiKeyService', apiKeyService);
        this.container.register('WebhookService', webhookService);
        this.container.register('WebhookJobService', webhookJobService);
        this.container.register('SdkService', sdkService);

        // Register controllers
        const apiKeyController = new (await import('./controllers/api-key.controller')).ApiKeyController(apiKeyService);
        const webhookController = new (await import('./controllers/webhook.controller')).WebhookController(webhookService);
        const publicApiController = new (await import('./controllers/public-api.controller')).PublicApiController(apiKeyService, webhookJobService);
        const sdkController = new (await import('./controllers/sdk.controller')).SdkController(sdkService);
        
        this.container.register('ApiKeyController', apiKeyController);
        this.container.register('WebhookController', webhookController);
        this.container.register('PublicApiController', publicApiController);
        this.container.register('SdkController', sdkController);

        // Start webhook job service
        webhookJobService.start();

        // Start SDK cleanup job (cleanup expired SDKs every hour)
        setInterval(async () => {
            try {
                const deletedCount = await sdkService.cleanupExpiredJobs();
                if (deletedCount > 0) {
                    console.log(`[App] Cleaned up ${deletedCount} expired SDK jobs`);
                }
            } catch (error) {
                console.error('[App] SDK cleanup error:', error);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        console.log('[App] Core services registered');
    }

    public getExpressApp(): ExpressApp {
        return this.expressApp;
    }

    public getContainer(): DependencyContainerService {
        return this.container;
    }
}