import asyncHandler from '../utils/asyncHandler.js'
import APIError from '../utils/APIError.js'
import {User} from '../models/user.model.js'
import uploadonCloudinary from '../utils/cloudinary.js'
import APIresponse from '../utils/APIResponse.js'
import jwt from 'jsonwebtoken'

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



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken
}