require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

// SET UP SESSION------below code comes from express-session
app.use(session({
  secret: process.env.PASSPORT_LONG_SECRET,
  resave: false, 
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", true);
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/testDB");
};

const userSchema = new mongoose.Schema ({
  email: String,
  username: String,
  googleId: String,
  facebookId: String, 
  githubId: String
});

userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
      return cb(null, user.id);
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


// -------GOOGLE STRATEGY--------
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate(
        { 
            googleId: profile.id
        }, 
        function (err, user) {
            return cb(err, user);
        }
    );
  }
));

// -------FACEBOOK STRATEGY--------
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    enableProof: true
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
    });
  }
));

// -------GITHUB STRATEGY--------
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/github/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ githubId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", function(req, res){
  res.render("home");
});

// -----GOOGLE AUTHENTICATION-----
app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

// -----FACEBOOK AUTHENTICATION-----
app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ["email"] })
);
 
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

// -----GITHUB AUTHENTICATION-----
app.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));
 
app.get('/auth/github/secrets', 
    passport.authenticate('github', { failureRedirect: '/login' }), function(req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    }
);

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});


app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.render("login");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
      if (err) { 
          return next(err); 
      }
      res.redirect("/");
  });
});

app.listen(process.env.PORT, function(){
  console.log("Server started on port 3000.");
});

