import 'dotenv/config';
import { App } from './app';

async function startServer(): Promise<void> {
    try {
        console.log('🚀 Starting API Service...');
        
        const app = new App();
        await app.bootstrap();
        
        const expressApp = app.getExpressApp();
        const port = process.env.PORT || 3006;
        
        const server = expressApp.getApp().listen(port, () => {
            console.log(`✅ API Service is running on port ${port}`);
            console.log(`📋 Health check available at: http://localhost:${port}/health`);
            
            // Log registered dependencies
            const container = app.getContainer();
            const dependencies = container.getRegisteredDependencies();
            console.log('📦 Registered dependencies:', dependencies);
        });

                // Graceful shutdown handling
        const shutdown = async (signal: string) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
            
            server.close(async () => {
                console.log('✅ HTTP server closed.');
                
                // Close database connections
                try {
                    const container = app.getContainer();
                    const dbPool = container.resolve<any>('DatabasePool');
                    if (dbPool && typeof dbPool.end === 'function') {
                        await dbPool.end();
                        console.log('✅ Database connections closed.');
                    }
                } catch (error) {
                    console.log('⚠️  Database pool not found or already closed.');
                }

                // Stop webhook job service
                try {
                    const container = app.getContainer();
                    const webhookJobService = container.resolve<any>('WebhookJobService');
                    if (webhookJobService && typeof webhookJobService.stop === 'function') {
                        webhookJobService.stop();
                        console.log('✅ Webhook job service stopped.');
                    }
                } catch (error) {
                    console.log('⚠️  Webhook job service not found or already stopped.');
                }
                
                console.log('👋 API Service shutdown complete.');
                process.exit(0);
            });
        };

        // Listen for termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start API Service:', error);
        process.exit(1);
    }
}

// Start the server
startServer();