const mustache = require('mustache-express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const models = require('./models/users'); //maybe this is the problem
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const flash = require('express-flash-messages');
const expressValidator = require('express-validator');
const User = models.User;
const LocalStrategy = require('passport-local').Strategy;
const mongoURL = 'mongodb://localhost:27017/test';
mongoose.Promise = require('bluebird');


const app = express();

mongoose.connect(mongoURL, {useMongoClient: true});
const Code = require('./models/codes');

app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', './views');

app.use('/static', express.static('static'));

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
                    message: "There is no user with that username and password."
                })
            }
        })
    }));

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function (err, user){
    done(err, user);
  });
});

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

app.get('/', function(req,res){
    res.render('index');
});



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
                return res.redirect('/');
            })
        })
});

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

const requireLogin = function (req, res, next){
  if (req.user){
    next()
  } else {
    res.redirect('/login/');
  }
}

app.get('/collection/', requireLogin, function (req, res) {
  Code.find().then(function(codes){
    res.render("collection", {codes:codes})
  })
});

//when this chunk of code was below the app.get ID it didnt work. Why?
app.get('/create', requireLogin, function(req,res){
  res.render('create');
})

app.post('/create', requireLogin, function(req,res){
  Code.create({
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

app.post('/:id/delete', requireLogin, function(req,res){
  Code.deleteOne({_id:req.params.id}).then(function(codes){
    res.redirect('/collection/')
  })
})

app.get("/:id/edit", requireLogin, function(req,res){
  Code.findOne({_id:req.params.id}).then(function(code){
    res.render('edit', {codes:codes})
  })
})

app.post('/:id/edit', requireLogin, function (req,res){
  Code.updateOne({_id:req.params.id},
  {
    "title": req.body.title,
    "codeBody": req.body.codeBody,
    "notes": req.body.notes,
    "language": req.body.language,
    "tags": req.body.tags
  })
  .then(function(update){
    res.redirect('/collection/');
  });
});

app.get('/:id', requireLogin, function(req,res){
  Code.findOne({_id:req.params.id}).then(function(codes){
    res.render('single', {codes:codes})
  })
})



module.exports = app;

app.listen(3000, function(){
  console.log("Running on Port 3000!")
});
