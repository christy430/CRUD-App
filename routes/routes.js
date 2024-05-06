const express=require("express");
const router=express.Router();
const User=require('../models/users');
const multer=require('multer');
const fs=require('fs');
const bcrypt=require('bcrypt');
const { log } = require("console");

//image upload
var storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./uploads')
    },
    filename:function(req,file,cb){
        cb(null,file.fieldname+"_"+Date.now()+"_"+file.originalname);
    },
});


//media upload
var upload=multer({
    storage: storage,
}).single("image");


//login page
router.get("/", (req, res) => {
  if(!req.session.user){
    res.render('user_login',{title:"user login"});
  }else{
   res.redirect("/userHome");
    }
});



//user login(bcrypt)
router.post("/user_login", async (req, res) => {
  console.log(req.body);
  try {
    const data = await User.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
    
    console.log(data);

    if (data) {
      const passwordMatch = await bcrypt.compare(req.body.password, data.password);

      if (passwordMatch) {
        req.session.user = req.body.email;
        res.redirect("/userHome");
      } else {
        res.render("user_login", { alert: "Entered Email or password is incorrect", title: "User Login" });
      }
    } else {
      res.render("user_login", { alert: "User not found", title: "User Login" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});


 // rendering home
 router.get('/userHome',(req,res)=>{
  if(!req.session.user){
   res.render("user_login",{title:'Use Login'})
  
  }else{
   
    res.render('userHome',{title:'Home',user:req.session.user})
  }
});



//rendering signUp
router.get('/signUp',(req,res)=>{
  res.render('signUp',{title:'signUp',user:req.session.user})
      
});



// signup
router.post('/signUp', async (req, res) => {
  try {
    // Check for spaces in the email
    if (/\s/.test(req.body.email)) {
      return res.render('signUp', {
        alert: 'Email cannot contain spaces.',
        title: 'Sign up'
      });
    }

    // Check password length and complexity
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.render('signUp', {
       alert: 'Password must be at least 8 characters long and contain letters, numbers, and special characters.',
        title: 'Sign up'
      });
    }

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.render('signUp', {
        alert: 'This email already exists. Try with another one',
        title: 'Sign up'
      });
    } else {
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
      });

      await newUser.save();
      return res.redirect('/');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});


//user logout
router.get("/logout", (req, res) => {
  req.session.destroy(function(err)  {
    if (err) {
      console.log(err);
      res.send("Err");
      
    } else {
      res.render("user_login",{title:"user login",logout:'Logout successfull'}); // Redirect to the login page after logout
    }
  });
});



//admin login
router.get('/admin_login',(req,res)=>{
  if(req.session.admin){
    res.redirect('/adminHome');
  }
  else{
  res.render("admin_login", { title: "admin_login ", error: "false" });
  }
});


//admin credential
const credential=
  {
    email:"admin@gmail.com",
    password:"admin"
  }
// Define isAuthenticated middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    // If the user is authenticated, proceed to the next route
    next();
  } else {
    // If not authenticated, redirect to the login page
    res.redirect("/admin_Login"); // You can adjust the route as needed
  }
};


//admin validation
router.post("/admin_login", (req, res) => {
    console.log(req.body,"helloo");

    const { email, password } = req.body;
    if (email === credential.email && password === credential.password) {
      req.session.isAuthenticated = true;
      req.session.admin = req.body.email;
      res.redirect("/adminHome");
    } else if (email === "" && password === "") {
      res.render("admin_Login", {
        title: "login",
        error_email: "Please Enter Email !",
        error_password: "Please Enter Password !",
      });
    } else if (email != credential.email && password != credential.password) {
      res.render("admin_Login", {
        title: "login",
        error_email: "Invalid email !",
        error_password: "Invalid password !",
      });
    } else if (email != credential.email) {
      res.render("admin_Login", {
        title: "login",
        error_email: "Invalid email !",
        error_password: "Invalid password !",
      });
    } else if (password != credential.password) {
      res.render("admin_Login", {
        title: "login",
        error_password: "Invalid password !",
      });
    } else {
      res.redirect("/admin_login");
    }
  });



//adminHome route
router.route('/adminHome')
  // GET request for adminHome route
  .get(isAuthenticated, async (req, res) => {
    if (req.session.admin) {
      try {
        // Fetch user data from the database
        const user = await User.find();
        console.log(user);
        res.render('adminHome', { user, title: "adminHome" });  // Pass the users data to the template
      } catch (error) {
        console.error(error);
        res.send("Error fetching user data");
      }
    } else {
      res.send("Unauthorized user");
    }
  })
  // POST request for adminHome route
  .post(upload, async (req, res) => {
    try {
      const id = req.params.id;
      const updatedData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
      };

      // Use the findByIdAndUpdate method
      const result = await User.findByIdAndUpdate(id, updatedData, { new: true });

      if (!result) {
        return res.redirect('/adminHome');
      }

      // Handle file upload
      if (req.file) {
        // Update the image property if a file is uploaded
        result.image = req.file.filename;
        await result.save();
      }

      req.session.message = {
        type: 'success',
        message: 'User updated successfully!',
      };

      res.redirect('/adminHome');
    } catch (error) {
      console.error(error);
      res.redirect('/adminHome');
    }
  });

//route for admin logout
router.get('/adminlogout',(req,res)=>{
    req.session.destroy(function(err){
        if(err){
            console.log(err);
            res.send("Error")

        }else{
            // res.setHeader(
            //   "Cache-Control",
            //   "no-store, no-cache, must-revalidate, private"
            // );
            res.render('admin_Login',{title:'admin login',message:"logout successful"});
        }
    })

});


//add user 
router.get('/add_users',(req,res)=>{
  res.render('add_users',{title:"Add Users"})
});


// Validation function for user data
function validateUserData(name, email, password, phone) {
  
  const nameRegex = /^[a-zA-Z]+$/;
  if (!nameRegex.test(name)) {
      return 'Invalid name. Only letters are allowed, and spaces are not permitted.';
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
      return 'Invalid email address.';
  }

  
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
      return 'Invalid password. It must contain at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long.';
  }

  
  const phoneNumberRegex = /^\d{10}$/;
  if (!phoneNumberRegex.test(phone)) {
      return 'Invalid phone number. It should be exactly 10 digits long.';
  }

 
  return null;
}


//insert a user into database route

router.post('/add', upload, async (req, res) => {
  try {
      // Use the validation function
      const validationMessage = validateUserData(req.body.name, req.body.email, req.body.password, req.body.phone);
      if (validationMessage) {
          return res.render('add_users', {
              title: 'Add Users',
              alert: validationMessage,
          });
      }

      // Check if a file was uploaded
      if (!req.file) {
          return res.render('add_users', {
              title: 'Add Users',
              alert: 'No file uploaded',
          });
      }

      // Create a new user instance
      const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          password: req.body.password,
          image: req.file.filename,
      });

      // Save the new user to the database
      await newUser.save();

      req.session.message = {
          type: 'success',
          message: 'User added successfully!',
      };

      res.redirect("/adminHome");
  } catch (error) {
      console.error(error);
      res.json({ message: error.message, type: 'danger' });
  }
});


//Edit user
router.get('/edit/:id',async (req,res)=>{
    
  try{
      let id=req.params.id;
      const user=await User.findById(id);
      if(!User){
          return res.redirect('/adminHome');
      }
      res.render("edit",{
          title:"Edit User",
          user:user,
          
      });
      }catch(error){
          console.log(error);
          res.redirect('/');
      }
});

//update user

router.post('/update/:id', upload, async (req, res) => {
  try {
      const id = req.params.id;

      // Use the validation function
      const validationMessage = validateUserData(req.body.name, req.body.email, req.body.password, req.body.phone);
      if (validationMessage) {
          return res.render('edit', {
              title: 'Edit User',
              user: { _id: id, ...req.body }, // Send back the user data to pre-fill the form
              alert: validationMessage,
          });
      }

      const updatedData = {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          phone: req.body.phone,
      };

      // Use the findByIdAndUpdate method
      const result = await User.findByIdAndUpdate(id, updatedData, { new: true });

      if (!result) {
          return res.redirect('/adminHome');
      }

      // Handle file upload
      if (req.file) {
          // Update the image property if a file is uploaded
          result.image = req.file.filename;
          await result.save();
      }

      req.session.message = {
          type: 'success',
          message: 'User updated successfully!',
      };

      res.redirect('/adminHome');
  } catch (error) {
      console.error(error);
      res.redirect('/adminHome');
  }
});

//delete user 
router.get('/delete/:id',async (req,res)=>{
  try{
  const id=req.params.id;
  const deletedUser=await User.findByIdAndDelete(id);

  if(!deletedUser){
      return res.redirect('/adminHome');
  }
  const imagepath=path.json(__dirname,'uploads',deleteduser.image);
  fs.unlinkSync(imagePath);

  req.session.message={
      type:'success',
      message:'user deleted successfully!',
  };

  res.redirect('/adminHome');
  }catch(error){
      console.error(error);
      res.redirect('/adminHome');
  }

});



//get all users route
router.get("/adminHome", async (req, res) => {
    try {
        const user = await User.find().exec();
         res.render('adminHome', {
            title: 'Home Page',
            user: user,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});






module.exports=router;