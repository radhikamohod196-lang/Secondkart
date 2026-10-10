import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function protect(req,res,next){try{const header=req.headers.authorization||'';const token=header.startsWith('Bearer ')?header.slice(7):null;if(!token)return res.status(401).json({message:'Please log in first.'});const decoded=jwt.verify(token,process.env.JWT_SECRET);const user=await User.findById(decoded.id);if(!user)return res.status(401).json({message:'Account not found.'});req.user=user;next();}catch(e){res.status(401).json({message:'Session expired. Please log in again.'});}}
export function allowRoles(...roles){return (req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({message:'You do not have permission to do that.'});}
