import User from "../models/user.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

export const Signup = async(req,res)=>{
    const{name,email,password,role}=req.body;
    try {

    const user = await User.findOne({email});
    if(user){
      res.status(500).json({
        message:"User is already there"
      })
    }

    const hatchedPassword = await bcrypt.hash(password,10);

    const data =  new User({email,name,password:hatchedPassword,role});
    await data.save()

    res.status(200).json({
        message:"User signed up successfully",
        data
    })
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message:"Error occured"
        })
        
    }
}

export const Login = async(req,res)=>{
    const{email,password}=req.body;
    try {
        const user = await User.findOne({email})

        if(!user){
            return res.send(404).json({
                message:"User not found"
            })
        }

        const match = await bcrypt.compare(password,user.password);
        if(!match){
            return res.status(400).json({
                message:"Invalid credentials"
            })

        }

        const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{
            expiresIn:"1h"
        })

       return res.status(200).json({
            message:"Login Successful",
            data:token,
            role:user.role
        })
    } catch (error) {
       return res.status(500).json({
            message:"An error occured"
        })
        
    }
}