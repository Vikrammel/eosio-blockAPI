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

//create connection with poolSize 1 so each thread only connects once to db
mongoose.connect(env.DATABASE, {poolSize: 1});

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

  const eos = Eos.Localnet(config);

  //wrap EOS API call to fetch block in try/catch function 
  //to handle bad block nums since it's called multiple times
  async function fetchBlock(blockNum){
    try{
      const dbBlock = await Block.getBlockByNum(blockNum);
      if(await dbBlock){
        return await dbBlock;
      }
      else {
        try{
          const block = await eos.getBlock(blockNum);
          try{
            const addedBlock = await Block.addBlock(await block);
            // console.log(await addedBlock);
            return await block;
          }
          catch(err){
            //error adding block to cache, just return block
            return await block;
          }
        }
        catch(err){
          console.log("EOS API returned an error; check block number")
          return {error: String(err)};
        }
      }
    }
    catch(err){
      //block not in DB, trying to find it returned an error
      try{
        const addedBlock = await Block.addBlock(await block);
        return await block;
      }
      catch(err){
        //failed to add block to cache, return block
        return await block;
      }
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

  /*define graphQL query schema;
  some numbers like block_num and ref_block_prefix are better as String 
  since they are too large to be represented as a 32-bit Int type by GraphQL */
  const schemaFile = fs.readFileSync(__dirname + '/models/schema.graphqls', 'utf8')
  const schema = buildSchema(schemaFile)

    
  //for resolving queries to api
  let resolveBlocks = async function(args) {
    if (args.numbers) {
        const numbers = args.numbers;
        const blocks = [];
        for (const blockNum of numbers){
          // console.log(blockNum);
          blocks.push( await getBlockData(blockNum));
        } 
        return await blocks;
    } 
    else {
        return [await getBlockData()];
    }
  }

  let resolveLastBlock = async function(args) {
      return await getBlockData();
  }

  //define root query
  let rootQuery = { 
    blocks: resolveBlocks,
    lastBlock: resolveLastBlock
  };

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