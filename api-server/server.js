'use strict'

//can't use ES6 imports without babel-node
const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const bodyParser = require('body-parser');
const fs = require('fs')
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
//most numbers like block_num and ref_block_prefix are better as String 
//since sometimes it is too large to be represented as a 32-bit Int 
//type by GraphQL
const schemaFile = fs.readFileSync(__dirname + '/schema.graphqls', 'utf8')
const schema = buildSchema(schemaFile)

//define root query
const rootQuery = { 
  block: getBlockData()
        .then(data => 
          { 
            returnBlockObj = data
            returnBlockObj["txn_count"] = data.input_transactions.length
            return returnBlockObj
          }
        )
        .catch(
          (e) => {return {error: e.message}}
        )
};

//function to continuously update the root query every second so it remains
//the latest block
setInterval(() => 
  { getBlockData()
    .then(data => 
      {
        rootQuery.block = data
        rootQuery.block.txn_count = data.input_transactions.length
      }
    )
  }
  , 500)

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
// console.log(printSchema(schema))
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
