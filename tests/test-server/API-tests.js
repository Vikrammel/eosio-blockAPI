//can't use ES6 imports without babel-node
//API server uri = env.API_SERVER

// const Eos = require('eosjs')
const env = require('./env');
const req = require('request-promise');
const fs = require('fs')
const util = require('util')

//set up output file for tests
const outfile = fs.createWriteStream(__dirname + '/api-tests-output.txt', { flags: 'a' });
fs.writeFile(__dirname + '/api-tests-output.txt', '', () =>{} );

// redirect stdout / stderr by overloading console.log
console.log = function(d, callback) { //
    outfile.write(util.format(d) + '\n', callback)
  };

// *************************************************************
// attempts at making accounts and transacting to fill blocks
// kept getting unknown key errors, couldn't figure out how to deploy
// basic token contract to make accounts for from eosjs documentation

// const keyProvider = [
//     '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
//     Eos.modules.ecc.seedPrivate('currency')
//   ]
// const wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
// const pubkey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
// const eos = Eos.Localnet(
    // { keyProvider: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3', 
    // httpEndpoint: env.EOSNODE});

// eos.transaction(txn => {
//         txn.newaccount({
//             creator: 'inita',
//             name: 'currency',
//             owner: pubkey,
//             active: pubkey
//         });
//         txn.newaccount({
//             creator: 'initb',
//             name: 'currency',
//             owner: pubkey,
//             active: pubkey
//         });
//         txn.buyrambytes({
//             payer: 'inita',
//             receiver: 'currency',
//             bytes: 8192
//         });
//         txn.delegatebw({
//             from: 'inita',
//             receiver: 'currency',
//             stake_net_quantity: '10000.0000 SYS',
//             stake_cpu_quantity: '10000.0000 SYS',
//             transfer: 0
//         });
//         // Returning a promise is optional (but handled as expected)
//     }
// );

// eos.transfer('inita', 'initb', '1 SYS', '', {broadcast: true, authorization: null})

// // transaction on a single contract
// eos.transaction('currency', currency => {
//     currency.transfer('inita', 'initb', '1 CUR', '')
// });

// returns Promise
// setInterval( async function (){
//     console.log(await eos.transaction({
//     actions: [
//       {
//         account: 'eosio.token',
//         name: 'transfer',
//         authorization: [{
//           actor: 'inita',
//           permission: 'active'
//         }],
//         data: {
//           from: 'inita',
//           to: 'initb',
//           quantity: '7 SYS',
//           memo: ''
//         }
//       }
//     ]
//   }).catch((err) => {console.log(err)}))}, 5000)
// *************************************************************

//test queries
const lastBlockQuery = 
`lastBlock{
    id
    timestamp
    txn_count
    block_num
  }`;

const multiBlockQuery = 
`blocks(numbers:[1, 5, 15, 99999999]) {
    id
    timestamp
    txn_count
    block_num
  }`;

//request options
let options = {
    method: 'POST',
    uri: env.API_SERVER,
    body: {
        query: "{ " + lastBlockQuery + " }"
    },
    json: true
};

//tests fetching last block from EOS node
async function lastBlockTest(){
    await console.log("***** Last Block Test ***** \n");
    let reqOptions = options;
    reqOptions.body.query = "{ " + lastBlockQuery + " }";
    const apiResp = await req(reqOptions);
    await console.log(apiResp);
    console.log("\n");
}

//tests fetching multiple blocks from EOS node
async function multiBlockTest(){
    await console.log("***** Multi-Block Test ***** \n");
    await console.log("(last block should be null)\n")
    let reqOptions = options;
    reqOptions.body.query = "{ " + multiBlockQuery + " }";
    const respBody = await req(reqOptions);
    for (let prop in respBody) {
        if (respBody.hasOwnProperty(prop)) {
            for(let queryProp in respBody[prop]){
                if(respBody[prop].hasOwnProperty(queryProp)){
                    await console.log(respBody[prop][queryProp]);
                }
            }
        }
    }
}

async function runTests(){
    await lastBlockTest();
    multiBlockTest();
}

runTests();


