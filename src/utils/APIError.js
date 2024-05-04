class APIError extends Error {
   constructor(
    statusCode,
    stack = "",
    message = "something went wrong",
    errors =[],
   ){
    super(message)
    this.data = null
    this.errors = errors
    this.success = false
    this.statusCode = statusCode

    if(stack){
        this.stack = stack
    }
    else{
        Error.captureStackTrace(this, this.constructor)
    }
   }
}

export default APIError