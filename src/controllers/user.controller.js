import asyncHandler from '../utils/asyncHandler.js'
import APIError from '../utils/APIError.js'
import {User} from '../models/user.model.js'
import uploadonCloudinary from '../utils/cloudinary.js'
import APIresponse from '../utils/APIResponse.js'

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

const loginUser = asyncHandler( async (req, res) => {

})

export {
  registerUser,
  loginUser
}