'use strict'

var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var bodyParser = require('body-parser');


//set server options
var app = express();
var port = process.env.API_PORT || 3001;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
app.use('/block', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

//set server to listen on port on any interface (0.0.0.0)
app.listen(port, "0.0.0.0", function() {
  console.log(`api running on port ${port}`);
});
