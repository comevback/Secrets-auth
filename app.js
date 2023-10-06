//jshint esversion:6
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import encrypt from "mongoose-encryption";
import ejs from "ejs";
import md5 from "md5";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

dotenv.config();
const app = express();
const port = 3000;
const saltRounds = 10;
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret: "thisisasecret",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MongoURL).then(() => {console.log("connected to the DB.");}).catch((err) => {console.log(err);});
const UserSchema = new mongoose.Schema({ 
    username: String,
    password: String,
    secrets: [String],
    googleId: String
});
UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);

//UserSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"]});

const Users = mongoose.model("user", UserSchema);
passport.use(Users.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        Users.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
        });
    }
));

app.listen(port, () => {
    console.log(`Server is listening on the port ${port}`);
});

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/login", (req,res) => {
    res.render("login.ejs");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/logout", (req, res, next) => {
    req.logOut(function(err){
        if(err){
            return next(err);
        }
        res.redirect("/");
    });
});

app.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    Users.register({username: username}, password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            })
        }
    })
});

app.get("/register", (req,res) => {
    res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
    // if(req.isAuthenticated()){
    //     Users.find({secrets: {$exists:true}}).then((err, foundUsers) => {
    //         if(err){
    //             console.log(err);
    //         }else{
    //             if(foundUsers){
    //                 res.render("secrets.ejs", {userwithSecrets: foundUsers});
    //             }
    //         }
    //     });
    //     res.render("secrets.ejs");
    // }else{
    //     res.redirect("/login");
    // }
    if (req.isAuthenticated()) {
        Users.find({ secrets: { $exists: true } })
            .then((foundUsers) => {
                if (foundUsers) {
                    res.render("secrets.ejs", { userwithSecrets: foundUsers });
                }
            })
            .catch((err) => {
                console.log(err);
            });
    } else {
        res.redirect("/login");
    }
});

app.post("/login", (req, res) => {
    const user = new Users({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local", {failureRedirect: '/login', failureMessage: true})(req, res, function(){
                console.log("success login");
                res.redirect("/secrets");
            })
        }
    });

}); 

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", async(req, res) => {
    //console.log(req.user);
    //const secret = req.body.secret;
    //console.log(req.body);
    //console.log(secret);
    try{
        const user = await Users.findById(req.user.id);
        console.log(user);
        user.secrets.push(req.body.secret);
        await user.save();
        res.redirect("/secrets");
    }catch(err){
        console.log(err);
    }
});