'use strict'

var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
// var mongoose = require('mongoose');
var bodyParser = require('body-parser');
// var cors = require('cors');
// var env = require('./config/env');
// var fs = require('fs');

// //https key/cert setup
// var hskey = fs.readFileSync(env.HTTPS_KEY);
// var hscert = fs.readFileSync(env.HTTPS_CERT);
// var options = {key: hskey, cert:hscert};

//set server options
var app = express();
// var router = express.Router();
var port = process.env.API_PORT || 3001;
// mongoose.connect(env.DATABASE);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(cors());

//define graphQL query schema
var schema = buildSchema(`
  type Query {
    block(number: Int): String
  }
`);

//define root query
var root = { 
  block: (number) => "24c38025d3df33rw3d3231" 
};

//api-route for eos block info
// app.use('/block', router);

app.use('/block', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

//set server to listen on port on any interface (0.0.0.0)
app.listen(port, "0.0.0.0", function() {
  console.log(`api running on port ${port}`);
});
