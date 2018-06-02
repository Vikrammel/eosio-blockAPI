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
//numbers like block_num and ref_block_prefix are better as String 
//since sometimes it is too large to be represented as a 32-bit Int 
//type by GraphQL

const schema = buildSchema(`
  type Block {
    previous: String
    timestamp: String
    transaction_mroot: String
    action_mroot: String
    block_mroot: String
    producer: String
    schedule_version: Float
    producer_signature: String
    id: String
    block_num: Int
    ref_block_prefix: String
    new_producers: [String]
  }
  type Query {
    block(numbers: [Int]): Block
  }
`);

//define root query
const rootQuery = { 
  block: getBlockData()
        .then(data => 
          { 

            return {
              previous: data.previous,
              timestamp: data.timestamp,
              transaction_mroot: data.transaction_mroot,
              action_mroot: data.action_mroot,
              block_mroot: data.block_mroot,
              producer: data.producer,
              schedule_version: data.schedule_version,
              producer_signature: data.producer_signature,
              id: data.id,
              block_num: data.block_num,
              ref_block_prefix: data.ref_block_prefix,
              new_producers: data.new_producers
            } 
          }
        )
};

//function to continuously update the root query every second so it remains
//the latest block
setInterval(() => 
  { getBlockData()
    .then(data => 
      {
        rootQuery.block = {
          previous: data.previous,
          timestamp: data.timestamp,
          transaction_mroot: data.transaction_mroot,
          action_mroot: data.action_mroot,
          block_mroot: data.block_mroot,
          producer: data.producer,
          schedule_version: data.schedule_version,
          producer_signature: data.producer_signature,
          id: data.id,
          block_num: data.block_num,
          ref_block_prefix: data.ref_block_prefix,
          new_producers: data.new_producers
        }
      }
    )
  }
  , 1000)

//wrap EOS API call to fetch block in try/catch function 
//to handle bad block nums since it's called multiple times
async function fetchBlock(blockNum){
  try{
    return await eos.getBlock(blockNum);
  }
  catch(e){
    console.log("EOS API returned an error; check block number")
    return;
  }
}

//function for fetching block data
async function getBlockData(blockNum){
  blockNum = blockNum || -1;
  if (blockNum === -1){
    let data = eos.getInfo({});
    const info = await data;
    const lastBlockNum = info['head_block_num'];
    return await fetchBlock(lastBlockNum)
  } 
  else {
      return await fetchBlock(blockNum);
  }
}

//temp tests
// setInterval(getBlockData().then(data => console.log(data)));
// getBlockData().then(data => {
//   console.log(data)
//   console.log(data.regions)
//   console.log(data.regions[0].cycles_summary[0][0].transactions)
//   }
// )

//api-route for eos block info
app.use('/block', graphqlHTTP({
  schema: schema,
  rootValue: rootQuery,
  graphiql: true,
}));

//set server to listen on port on any interface (0.0.0.0)
app.listen(port, "0.0.0.0", function() {
  console.log(`api running on port ${port}`);
});
