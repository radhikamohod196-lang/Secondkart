import Listing from '../models/Listing.js';
export async function advisePrice({title,category,condition,originalPrice}){
 const query={category,status:'available',price:{$gt:0}};
 if(condition) query.condition=condition;
 const words=String(title||'').toLowerCase().split(/\W+/).filter(w=>w.length>2).slice(0,5);
 let candidates=await Listing.find(query).select('title price originalPrice condition').limit(200).lean();
 if(words.length){const matched=candidates.filter(x=>words.some(w=>x.title.toLowerCase().includes(w)));if(matched.length>=3)candidates=matched;}
 if(candidates.length<3){return {sufficient:false,count:candidates.length,message:'Not enough comparable listings yet. Add a fair price based on your own research.',suggestedRange:null,midpoint:null};}
 let values=candidates.map(x=>x.price).filter(Number.isFinite).sort((a,b)=>a-b);
 const q=(p)=>values[Math.min(values.length-1,Math.floor((values.length-1)*p))];
 let low=q(.25),high=q(.75);
 if(Number(originalPrice)>0){low=Math.min(low,Number(originalPrice)*.25+low*.75);high=Math.min(high,Number(originalPrice)*.9+high*.1);}
 const factor={'Like New':1,'Very Good':.9,'Good':.78,'Fair':.62}[condition]||1;
 low=Math.max(1,Math.round(low*factor));high=Math.max(low,Math.round(high*factor));
 return {sufficient:true,count:candidates.length,suggestedRange:{min:low,max:high},midpoint:Math.round((low+high)/2),message:'Estimate based on current comparable listings, not a guaranteed market value.'};
}
