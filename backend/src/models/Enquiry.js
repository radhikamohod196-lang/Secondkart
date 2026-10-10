import mongoose from 'mongoose';
const schema=new mongoose.Schema({listingId:{type:mongoose.Schema.Types.ObjectId,ref:'Listing',required:true},fromUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},sellerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},message:{type:String,required:true,maxlength:1000},createdAt:{type:Date,default:Date.now}},{timestamps:true});
export default mongoose.model('Enquiry',schema);
