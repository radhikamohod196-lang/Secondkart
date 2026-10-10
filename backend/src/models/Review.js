import mongoose from 'mongoose';
const schema=new mongoose.Schema({sellerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},buyerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},listingId:{type:mongoose.Schema.Types.ObjectId,ref:'Listing',required:true},rating:{type:Number,min:1,max:5,required:true},comment:{type:String,default:'',maxlength:500}},{timestamps:true});
schema.index({buyerId:1,listingId:1},{unique:true}); export default mongoose.model('Review',schema);
