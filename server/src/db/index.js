import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import dotenv from "dotenv"

dotenv.config();

const connectDB = async () => {
  try {
    // Prevent multiple connections in serverless environment
    if (mongoose.connections[0].readyState) {
      console.log('Using existing MongoDB connection');
      return;
    }

    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB connected at host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export default connectDB;

