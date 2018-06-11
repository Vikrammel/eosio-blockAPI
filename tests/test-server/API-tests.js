//can't use ES6 imports without babel-node

const Eos = require('eosjs') // Eos = require('./src')
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

//API server url = env.API_SERVER

//eos config options
const config = {
    // chainId: null, // 32 byte (64 char) hex string
    httpEndpoint: env.EOSNODE,
    keyProvider: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3', // WIF string or array of keys..
    // mockTransactions: () => 'pass', // or 'fail'
    //     transactionHeaders: (expireInSeconds, callback) => {
    //     callback(null/*error*/, {'ref_block_num'})
    // },
    expireInSeconds: 60,
    // broadcast: false,
    // debug: true,
    // sign: true
}

const eos = Eos.Localnet(config)

// returns Promise
setInterval( async function (){
    console.log(await eos.transaction({
    actions: [
      {
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: 'inita',
          permission: 'active'
        }],
        data: {
          from: 'inita',
          to: 'initb',
          quantity: '7 SYS',
          memo: ''
        }
      }
    ]
  }).catch((err) => {console.log(err)}))}, 5000)

const lastBlockQuery = 
`lastBlock{
    id
    timestamp
    txn_count
    block_num
  }`;

const multiBlockQuery = 
`blocks(numbers:[1, 5]) {
    id
    timestamp
    txn_count
    block_num
  }`;

let options = {
    method: 'POST',
    uri: env.API_SERVER,
    body: {
        query: "{ " + lastBlockQuery + " }"
    },
    json: true
};

//test fetching the last block
console.log("***** Last Block Test ***** \n", () => {
    req(options)
        .then(function (parsedBody) {
            // POST succeeded...
            console.log(parsedBody, ()=>{});
        })
        .catch(function (err) {
            // POST failed...
            console.log(err, ()=>{});
        });
    }
);

//test fetching multiple blocks
console.log("***** Multi-Block Test ***** \n", function() {
    options.body.query = "{ " + multiBlockQuery + " }";
    req(options)
        .then(function (respBody) {
            console.log(respBody, ()=>{});
        })
        .catch(function (err) {
            console.log(err, ()=>{});
        });
});

