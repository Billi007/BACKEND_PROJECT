import asyncHandler from '../utils/asyncHandler.js'
import APIError from '../utils/APIError.js'
import {User} from '../models/user.model.js'
import uploadonCloudinary from '../utils/cloudinary.js'
import APIresponse from '../utils/APIResponse.js'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import mongoose from 'mongoose'
import { pipeline } from 'stream'

const generateRefreshAndAcessToken = async(userId) =>{
 try {

  const user = await User.findById(userId)
  const accessToken =  user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave : false })

  return {accessToken, refreshToken}

 } catch (error) {
  throw new APIError(500, "Something went wrong while generating Refresh and Access token")
 }
}

//###
const registerUser = asyncHandler (async (req, res) => {
  
  // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
   
    const {email, fullName, userName, password} = req.body

    if(
      [fullName, email, userName, password].some((field) => field?.trim() === "")
    ){
      throw new APIError(400, "All fields are required.")
    }

    const existingUser = await User.findOne({
      $or :  [{email} , {userName}]
    })
    // console.log(existingUser)
    

    if(existingUser){
      throw new APIError(401, "User with Username or Email already exists.")
    }

     const avtarLocalpath = req.files?.avatar[0]?.path;
     const coverImageLocalpath = req.files?.coverImage[0]?.path;

     if(!avtarLocalpath){
      throw new APIError(400, "Avatar localpath is required.")
     }

      const avatar =  await uploadonCloudinary(avtarLocalpath);
      const coverImage = await uploadonCloudinary(coverImageLocalpath);

      if(!avatar){
        throw new APIError(400, "Avatar is required.")
      }

       const user = await User.create({
        fullName,
        coverImage: coverImage?.url || "",
        avatar: avatar.url,
        userName: userName.toLowerCase() ,
        email,
        password
      })

       const createdUser = await User.findById(user._id).select("-password -refreshToken")

       if(!createdUser){
        throw new APIError(500, "Something went wrong while registering the user.")
       }
     
       return res.status(201).json(
        new APIresponse(200, createdUser, "User registered Successfully.")
       )

})

//###
const loginUser = asyncHandler( async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    // take access and referesh token
    //send cookie

    const {email, password, userName} = req.body

    if(!userName && !email){
      throw new APIError(400, "Username or email is required")
    }

    const user = await User.findOne({
      $or : [{userName},{email}]
    })

    if(!user){
      throw new APIError(405, "User does not Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
      throw new APIError(401, "Invalid user credentials.")
    }

   const {accessToken, refreshToken} = await generateRefreshAndAcessToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     const options = {
       httpOnly : true ,
       secure : true
     }
   
       return res
       .status(200)
       .cookie("refreshToken", refreshToken, options )
       .cookie("accessToken", accessToken, options)
       .json(
         new APIresponse(
          200,
         {
          user : loggedInUser, accessToken, refreshToken
         },
         "User logged in Successfully."
         )
       )
  })

  //###
  const logoutUser = asyncHandler( async (req, res) => {
   await User.findByIdAndUpdate(
    req.user._id,
    {
      $set : {
        refreshToken : undefined
      }
    },
    {
      new: true
    }
   )
   const options = {
    httpOnly : true ,
    secure : true
  }

  return res
  .status(200)
  .clearCookie("refreshToken" , options)
  .clearCookie("accessToken" , options)
  .json(
    new APIresponse(200, {}, "User logged out successfully.")
  )
})

//###
const refreshAcessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = await req.cookies.refreshToken || req.header.refreshToken;

  if(!incomingRefreshToken){
    throw new APIError(400, "Unauthorized request.")
  }
  
 try {
   const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
 
   const user = await User.findById(decodedToken?._id);
   if(!user){
     throw new APIError(401, "Invalid Refresh Token.")
   }
 
   if(incomingRefreshToken !== user?.refreshToken){
     throw new APIError(401, "Refresh Token is expired.")
   }
   
   const {accessToken, NewrefreshToken} = generateRefreshAndAcessToken(user._id)
    
   const options = {
     httpOnly : true ,
     secure : true
   }
   
   return res
   .status(200)
   .cookie("accessToken" , accessToken)
   .cookie("refreshToken", NewrefreshToken)
   .json(
     new APIresponse(
       200,
       {accessToken, refreshToken: NewrefreshToken},
       "Access Token refreshed."
     )
   )
 } catch (error) {
   throw new APIError(401, error.message || "Invalid refresh Token.")
 }
})

//###
const changeCurrentPassword = asyncHandler (async (req, res) => {

 const {oldPassword, newPassword, confirmPassword} = req.body;
 const user = await User.findById(req.user?._id)

 //checking if our old password is correct or not
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new APIError(400, "Invalid old password.")
  }

  user.password = newPassword;
  user.save({validateBeforeSave: false})

  if(newPassword !== confirmPassword){
    throw new APIError(401, "Password does not match.")
  }

  return res
  .status(200)
  .json(200, {}, "Password changed Successfully.")
})

//###
 const getCurrentUser = asyncHandler( async (req,res)=> {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully.")
 })


 //###
 const updateAccountDetails = asyncHandler( async(req, res) => {
  const {email, fullName} = req.body

  if(!fullName || !email){
    throw new APIError(401, "All fields are required.")
  }

   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {
     //Return new information after Update
      new: true                                                     
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new APIresponse(200, user, "Account details updated Successfully.")
  )
})

//###
const updateAvatar = asyncHandler(async (req, res) => {

 const avatarLocalPath = req.file?.path
 if(!avatarLocalPath){
  throw new APIError(401, "cannot find avatar file.")
 }

 const avatar = await uploadonCloudinary(avatarLocalPath)
 if(!avatar.url){
  throw new APIError(401, "Error while uploading avatar.")
 }

 const user = await User.findByIdAndUpdate(
  req.user._id,
  {
    $set: {
      avatar : avatar.url
    }
  },
  {new : true}
).select("-password")

 const oldImageToBeDeleted = fs.unlinkSync(avatar.url);

return res
.status(200)
.json(
  new APIresponse(200, user, "Avatar uploaded successfully.")
)
})

//###
const updateCoverImage = asyncHandler(async (req, res) => {

  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
   throw new APIError(401, "cannot find cover Image file.")
  }
 
  const coverImage = await uploadonCloudinary(avatarLocalPath)
  if(!coverImage.url){
   throw new APIError(401, "Error while uploading cover Image.")
  }
 
  const user = await User.findByIdAndUpdate(
   req.user._id,
   {
     $set: {
       coverImage : coverImage.url
     }
   },
   {new : true}
 ).select("-password")
 
 return res
 .status(200)
 .json(
   new APIresponse(200, user, "Cover Image uploaded successfully.")
 )
 })

 //###
 const getUserChannelProfiile = asyncHandler(async (req, res) => {
  const {userName} = req.params;

  if(!userName?.trim()){
    throw new APIError(400, "cannot find username.")
  }

   const channel = await User.aggregate([
    //first pipeline
    {
      $match: {
        userName : userName?.toLowerCase()
      }
    },
    {
      $lookup: {
        from : "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from : "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribed"
      }
    },
    {
      $addFields: {

        subscribersCount: {
          $size : "$subscribers"
        },
        subscribedToCount: {
          $size : "$subscribed"
        },
        isSubscribed : {
          $cond : {
            $if : {$in: [req.user._id,  "$subscribers.subscriber"]},
            then : true,
            else: false
          }
        }
      }
    },
    //second pipeline
    {
      $project: {
        fullName: 1,
        userName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
      }
    }
  ])
  console.log(channel)

  if(!channel?.length){
   throw new APIError(400, "channel does not exist.")
  }

  res
  .status(200)
  .json(
    new APIresponse(200, channel[0], "channel fetched successfully.")
  )
 })

 //###
 const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
   $lookup: {
      from: "videos",
      localField: "watchHistory",
       foreignField: "_id",
       as: "watchHistory",

       pipeline: [
          {
         $lookup: {
         from: "users",
         localField: "owner",
         foreignField: "_id",
         as: "owner",

         pipeline: [{
         $project: {
          fullName: 1,
          userName: 1,
          avatar: 1
       }
     }]
     }
   },
  {
    $addFields:{
    videoOwner:{
     $first: "$owner"
       }
      }
     }]
    }
  }
])

res
.status(200)
.json(
 new APIresponse(200, user[0].watchHistory, "watch history fetched successfully.")
)

 })


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfiile,
  getWatchHistory
}