const mongoose=require('mongoose');
const bcrypt=require('bcrypt');
const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    phone:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:false,
    },
    created:{
        type:Date,
        required:true,
        default:Date.now,
    }
});
//hash password
userSchema.pre('save', async function (next) {
    const user = this;
  
    // Hash the password only if it's modified or new
    // if (!user.isModified('password')) return next();
  
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;
      next();
    } catch (error) {
      return next(error);
    }
  });

module.exports=mongoose.model('User',userSchema);