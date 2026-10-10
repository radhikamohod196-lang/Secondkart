import Listing from '../models/Listing.js';
import Review from '../models/Review.js';
export async function getTrustScore(user){
 const [sales,reviewStats]=await Promise.all([Listing.countDocuments({sellerId:user._id,status:'sold'}),Review.aggregate([{$match:{sellerId:user._id}},{$group:{_id:null,avg:{$avg:'$rating'},count:{$sum:1}}}])]);
 const ageDays=Math.max(0,Math.floor((Date.now()-new Date(user.createdAt).getTime())/86400000));
 const review=reviewStats[0]||{avg:0,count:0};
 const score=Math.min(100,Math.round(Math.min(30,ageDays/3)+Math.min(35,sales*7)+Math.min(35,(review.avg/5)*35)));
 const sufficient=sales>0||review.count>=2||ageDays>=30;
 return {score:sufficient?score:null,label:sufficient?'Trust score':'New Seller — Building Trust',signals:{completedSales:sales,eligibleRatings:review.count,averageRating:Number(review.avg.toFixed(1)),accountAgeDays:ageDays},formula:'Up to 30 points for account age, 35 for completed sales, and 35 for eligible buyer ratings. No signal is fabricated.'};
}
