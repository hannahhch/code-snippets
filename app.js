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
mongoose.Promise = require('bluebird');

const app = express();

mongoose.connect('mongodb://localhost:27017/test');

app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', './views');

app.use('/static', express.static('static'));


module.exports = app();

  app.listen(3000, function(){
    console.log("Running")
  });
