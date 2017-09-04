const mustache = require('mustache-express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const models = require('./models');
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const flash = require('express-flash-messages');
const expressValidator = require('express-validator');
const User = models.User;
const LocalStrategy = require('passport-local').Strategy;

const app = express();

//find out which DB you are using
mongoose.connect('mongodb://localhost/test');

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', './views');

app.use(express.static(__dirname + './public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
  secret: "password",
  resave: false,
  saveUninitialized: true
}));
