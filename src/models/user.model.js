import mongoose from "mongoose";
import { Schema } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema({
    userName : {
        type : String,
        require :  [true, "Username is required"],
        lowerCase : true,
        trim : true,
        unique : true,
        index : true,
    },
    email : {
        type : String,
        require :  [true, "Email is required"],
        lowerCase : true,
        trim : true,
        unique : true,
    },

    fullName : {
        type : String,
        require : true,
        trim : true,
    },
    avatar : {
        type : String,
        require :  [true, "Avatar is required"],
    },
    coverImage : {
        type : String,
    },
    password : {
        type : String,
        require : [true, "Password is required"]
    },
    watchHistory : {
        type : Schema.Types.ObjectId,
        ref: "Video"
    },
    refreshToken : {
        type : String,
    }
}, {timestamps: true})

userSchema.pre("save", async function (next){

    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
 return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)