'use strict'

const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const bodyParser = require('body-parser');
const Eos = require('eosjs')

//set server options
const app = express();
const port = process.env.API_PORT || 3001;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//eos config options
const config = {
  chainId: null, // 32 byte (64 char) hex string
  httpEndpoint: 'http://eosio:8888',
  mockTransactions: () => 'pass', // or 'fail'
  transactionHeaders: (expireInSeconds, callback) => {
    callback(null/*error*/, headers)
  },
  expireInSeconds: 60,
  broadcast: true,
  debug: false,
  sign: true
}

const eos = Eos.Localnet(config)

//define graphQL query schema
const schema = buildSchema(`
  type Query {
    block(numbers: [Int]): String
  }
`);

//define root query
const root = { 
  block: (number) => getBlockData().then(data => data['id'])
};

//wrap EOS API call to fetch block in try/catch function 
//since it's called multiple times
async function fetchBlock(blockNum){
  try{
    return await eos.getBlock(blockNum);
  }
  catch(e){
    console.log("EOS API error: " + String(e))
    return;
  }
}

//function for fetching block data
async function getBlockData(blockNum){
  blockNum = blockNum || -1;
  if (blockNum === -1){
    let data = eos.getInfo({});
    const info = await data;
    // console.log(info);
    const lastBlockNum = info['head_block_num'];
    return await fetchBlock(lastBlockNum)
    
  } 
  else {
      return await fetchBlock(blockNum);
  }
}

//temp tests
getBlockData()
.then(data => console.log(data));

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
