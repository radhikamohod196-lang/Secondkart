import mongoose from 'mongoose';
export default async function connectDB(){
  const uri=process.env.MONGODB_URI;
  if(!uri) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure it.');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
