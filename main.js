//imports
require('dotenv').config();
const express=require('express');
const mongoose=require('mongoose');
const session=require('express-session');
const nocache=require('nocache');
const bcrypt=require('bcrypt');


const app=express();
const PORT=process.env.PORT ||4000;

//database connection
const connect = mongoose.connect("mongodb://127.0.0.1:27017/CRUD_app",{
    useNewUrlparser:true,
    useUnifiedTopology:true,
});
connect
.then(()=>{
    console.log("mongodb server is now connected");
})
.catch(()=>{
    console.log("mongodb is not connected");
});

//middlewares
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(session({
    secret:'my secret key',
    saveUninitialized:false,
    resave:false,
    })
);

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
  });

//nocache for session management
app.use(nocache());

app.use((req,res,next)=>{
    res.locals.message=req.session.message;
    delete req.session.message;
    next();
});

app.use(express.static('uploads'));

app.use('/static',express.static('public'));
app.use('/assets',express.static('public/assets'));

//set template engine
app.set('view engine','ejs');

//route prefix
app.use("",require("./routes/routes"));

app.listen(PORT,()=>{
    console.log(`Server started at http://localhost:${PORT}`);
});
