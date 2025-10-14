import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import and start the application
import('./app')
  .then(() => {
    console.log('File service module loaded successfully');
  })
  .catch((error) => {
    console.error('Failed to load file service:', error);
    process.exit(1);
  });