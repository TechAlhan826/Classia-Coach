const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
  try {
    // Optimized connection options for small CPU
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000, // Increased for Render latency
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      readPreference: 'primary',
      writeConcern: {
        w: 1,
        j: false
      }
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB connected successfully');
    
    // Monitor connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
};

module.exports = connectDB; 