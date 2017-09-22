const mustache = require('mustache-express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const flash = require('express-flash-messages');
const expressValidator = require('express-validator');
const LocalStrategy = require('passport-local').Strategy;
//const mongoURL = 'mongodb://localhost:27017/test';
mongoose.Promise = require('bluebird');

const model = require('./models/users');
const User = model.User;
const Code = require('./models/codes');

//this URI is neccessary for Heroku
const mongoURL = process.env.MONGODB_URI;

const app = express();

//connection
mongoose.connect(mongoURL, {useMongoClient: true});

//use mustache templates
app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', './views');

//use stylesheet
app.use('/static', express.static('static'));

//start passport authentication
passport.use(new LocalStrategy(
  function(username, password, done) {
    User.authenticate(username, password, function(err, user) {
      if (err) {
        return done(err)
      }
      if (user) {
        return done(null, user)
      } else {
        return done(null, false, {
          //if no user, send error message
          message: "There is no user with that username and password."
        })
      }
    })
  }
));
//encode the user
passport.serializeUser(function(user, done){
  done(null, user.id);
});

//deserializeUser
passport.deserializeUser(function(id, done){
  User.findById(id, function (err, user){
    done(err, user);
  });
});

//use body parse npm module for form data
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(expressValidator());

app.use(session({
  secret: "abracadabra",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(req, res, next){
  res.locals.user = req.user;
  next();
})

//login/register page
app.get('/', function(req,res){
  res.render('index');
});

//render loging page and redirect success or failure
app.get('/login/', function(req, res){
  res.render('login',{
    messages: res.locals.getMessages()
  });
});

app.post('/login/', passport.authenticate('local', {
  successRedirect: '/collection/',
  failureRedirect: "/login/",
  failureFlash: true
}))

app.get('/register/', function(req, res){
  res.render('register');
});

//validation
app.post('/register/', function(req, res){
  req.checkBody('username', 'Username must be alphanumeric').isAlphanumeric();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();


  req.getValidationResult()
  .then(function(result) {
    if (!result.isEmpty()) {
      return res.render("register", {
        username: req.body.username,
        errors: result.mapped()
      });
    }
    const user = new User({
      username: req.body.username,
      password: req.body.password
    })

    const error = user.validateSync();
    if (error) {
      return res.render("register", {
        errors: normalizeMongooseErrors(error.errors)
      })
    }

    user.save(function(err) {
      if (err) {
        return res.render("register", {
          messages: {
            error: ["That username is already taken."]
          }
        })
      }

      req.login(user, function () {
        if (err) {
          return next(err);
        }
        return res.redirect('/');
      })
    })
  });
});

//error messages
function normalizeMongooseErrors(errors) {
  Object.keys(errors).forEach(function(key) {
    errors[key].message = errors[key].msg;
    errors[key].param = errors[key].path;
  });
}

app.get('/logout/', function(req, res){
  req.logout();
  res.redirect('/');
});

//if no login, redirect to login page
const requireLogin = function (req, res, next){
  if (req.user){
    next()
  } else {
    res.redirect('/login/');
  }
}

//"author" checks to only show snippets of logged in author
//.sort makes sure that when you add a new snippet, its placed on top
app.get('/collection/', requireLogin, function (req, res) {
  Code.find({author: req.user.username}).sort([['_id', 'descending']]).then(function(codes){
    res.render("collection", {codes:codes})
  })
});

//create a new snippet
app.get('/create', requireLogin, function(req,res){
  res.render('create');
})

//REGEX code, separates out the tags and inserts some space
app.post('/create', requireLogin, function(req,res){
  req.body.tags = req.body.tags.replace(/\s/g, '').split(",")
  Code.create({
    "author": req.user.username,
    "dateAdded": req.body.dateAdded,
    "title": req.body.title,
    "codeBody": req.body.codeBody,
    "notes": req.body.notes,
    "language": req.body.language,
    "tags": req.body.tags
  })
  .then(function(codes){
    res.redirect('/collection/')
  })
})

//delete a snippet
app.post('/:id/delete', requireLogin, function(req,res){
  Code.deleteOne({
    _id:req.params.id,
    "author": req.user.username,
  }).then(function(codes){
    res.redirect('/collection/')
  })
})

//edit a snippet
app.get("/:id/edit", requireLogin, function(req,res){
  Code.findOne({_id:req.params.id}).then(function(codes){
    res.render('edit', {codes:codes})
  })
})

app.post('/:id/edit', requireLogin, function (req,res){
  Code.updateOne(
    {
      _id:req.params.id,
      "author": req.user.username,
    },
    {
      "dateAdded": req.body.dateAdded,
      "title": req.body.title,
      "codeBody": req.body.codeBody,
      "notes": req.body.notes,
      "language": req.body.language,
      "tags": req.body.tags
    }
  )
  .then(function(update){
    res.redirect('/collection/');
  });
});

//single snippet
app.get('/code-sample/:id', requireLogin, function(req,res){
  Code.findOne({_id:req.params.id}).then(function(codes){
    res.render('single', {codes:codes})
  })
})

//renders page to show all of the same language (ALL USERS)
app.get('/language/:language', requireLogin, function(req,res){
  Code.find({language: req.params.language}).then(function(codes){
    res.render('language', {codes:codes})
  })
})

//renders page to show all of same tags (ALL USERS)
app.get('/tags/:tags', requireLogin, function(req,res){
  Code.find({tags: req.params.tags}).then(function(codes){
    res.render('tags', {codes:codes})
  })
})

module.exports = app;

//neccessary to change for heroku to work
app.listen(process.env.PORT || 8000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
