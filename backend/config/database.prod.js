const mongoose = require('mongoose');

// Production Database Configuration with Connection Pooling
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PRODUCTION 
      : process.env.MONGODB_URI || 'mongodb://localhost:27017/internationaltijarat';
    
    const conn = await mongoose.connect(mongoURI, {
      // Connection Pool Settings for High Concurrency
      maxPoolSize: 50, // Maximum 50 connections in pool
      minPoolSize: 5,  // Minimum 5 connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting server
      socketTimeoutMS: 45000, // How long socket stays open
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
      
      // Modern Connection Options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Buffer Commands
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    // Production Logging (Minimal)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
    }
    
    // Connection Event Handlers
    mongoose.connection.on('connected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 Mongoose connected to MongoDB');
      }
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Graceful shutdown with connection pool cleanup
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed through SIGTERM');
        process.exit(0);
      } catch (error) {
        console.error('Error during SIGTERM shutdown:', error);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
