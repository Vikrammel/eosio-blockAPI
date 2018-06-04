'use strict'

//can't use ES6 imports without babel-node
const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const bodyParser = require('body-parser');
const fs = require('fs');
const Eos = require('eosjs');
const cluster = require('cluster');
const mongoose = require('mongoose');
const env = require('./env');
const Block = require('./models/block');

// coordinator thread for multi-threading
if (cluster.isMaster){
  const cpuCount = require('os').cpus().length;
  for (let i = 0; i< cpuCount; i++){
    cluster.fork();
  }

  // spawn new worker thread on thread exit so we don't run out of worker
  // threads upon thread death
  cluster.on('exit', () => {
    cluster.fork();
  });
}

//working threads' code
else{
  //set server options
  const app = express();
  const port = process.env.API_PORT || 3001;
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  mongoose.connect(env.DATABASE);

  //eos config options
  const config = {
    chainId: null, // 32 byte (64 char) hex string
    httpEndpoint: env.EOSNODE,
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

  /*define graphQL query schema
    some numbers like block_num and ref_block_prefix are better as String 
    since they are too large to be represented as a 32-bit Int type by GraphQL */
  const schemaFile = fs.readFileSync(__dirname + '/models/schema.graphqls', 'utf8')
  const schema = buildSchema(schemaFile)

  //define root query
  let rootQuery = { 
    block: getBlockData()
          .then(data => 
            { 
              returnBlockObj = data
              returnBlockObj["txn_count"] = data.input_transactions.length
              return returnBlockObj
            }
          )
          .catch(
            (e) => {return {error: String(e)}}
          )
  };

  //function to continuously update the root query every second so it remains
  //the latest block
  setInterval(() => 
    { getBlockData()
      .then( (data) => {
        if (!data.error){
          rootQuery.block = data
          rootQuery.block.txn_count = data.input_transactions.length
        }
      })
    }
    , 500);

  //wrap EOS API call to fetch block in try/catch function 
  //to handle bad block nums since it's called multiple times
  async function fetchBlock(blockNum){
    try{
      const block = await eos.getBlock(blockNum);
      try{
        const dbBlock = await Block.getBlockByNum(blockNum);
        if(dbBlock != null){
          return await dbBlock;
        }
        try{
          const addedBlock = await Block.addBlock(await block);
          if(addedBlock != null){
            // console.log(addedBlock);
            return await addedBlock;
          }
          return await block;
        }
        catch(err){
          //error adding block to cache, just return block
          return await block;
        }
      }
      catch(err){
        //block not in DB, trying to find it returned an error
        try{
          const addedBlock = await Block.addBlock(await block);
          if(addedBlock != null){
            return await addedBlock;
          }
          //add to db failed
          return await block;
        }
        catch(err){
          //failed to add block to cache, return block
          return await block;
        }
      }
    }
    catch(err){
      console.log("EOS API returned an error; check block number")
      return {error: String(err)};
    }
  }

  //function for fetching block data from db or EOS node
  async function getBlockData(blockNum){
    blockNum = blockNum || -1;
    if (blockNum === -1){
      const data = await eos.getInfo({});
      const lastBlockNum = await data['head_block_num'];
      return await fetchBlock(await lastBlockNum);
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
  app.use('/blocks', graphqlHTTP({
    schema: schema,
    rootValue: rootQuery,
    graphiql: true,
  }));

  //set server to listen on port on any interface (0.0.0.0)
  app.listen(port, "0.0.0.0", function() {
    console.log(`api running on port ${port}`);
  });
}