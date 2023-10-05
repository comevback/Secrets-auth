//jshint esversion:6
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import encrypt from "mongoose-encryption";
import ejs from "ejs";
import {mongoUrl} from "./config.js"
import md5 from "md5";

dotenv.config();
const app = express();
const port = 3000;
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

mongoose.connect(mongoUrl).then(() => {console.log("connected to the DB.");}).catch((err) => {console.log(err);});
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    secrets: [String]
});

//UserSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"]});

const Users = mongoose.model("user", UserSchema);

app.listen(port, () => {
    console.log(`Server is listening on the port ${port}`);
});

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/login", (req,res) => {
    res.render("login.ejs");
});

app.post("/register", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(`username: ${username} \npassword: ${password}`);
    try{
        const exist = await Users.findOne({username:username});
        if(!exist){
            const user = new Users({
                username: username,
                password: md5(password)
            });
            user.save();
            res.redirect("/login");
        }else{
            console.log("User already exist.");
            res.status(400).send("User already exist.")
        }
    }catch(err){
        console.log(err);
    }
});

app.get("/register", (req,res) => {
    res.render("register.ejs");
});

app.post("/login", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(`username: ${username} \npassword: ${password}.`);
    try{
        const user = await Users.findOne( {username:username});
        if (!user){
            console.log("User not exist.")
        }
        console.log(user);
        if(user.password === password){
            res.redirect("/secrets");
        }else{
            res.status(400).send("password is not correct.");
        }
    }catch(err){
        console.log(err);
    }
});

app.get("/secrets", (req, res) => {
    res.render("secrets.ejs");
});

app.get("/submit", (req, res) => {
    res.render("submit.ejs");
});

app.post("/submit", async(req, res) => {
    const secret = req.body.secret;
    console.log(req.body);
    console.log(secret);
    try{

    }catch(err){
        console.log(err);
    }
});