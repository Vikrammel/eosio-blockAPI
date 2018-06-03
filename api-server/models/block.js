'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//create instance of mongoose.schema. Schema takes an object
//that shows the shape/structure of db entries

const action = {
    account: String,
    name: String,
    authorization: [{
        actor: String,
        permission: String
    }],
    data: {
        to: String,
        from: String,
        quantity: String,
        memo: String
    },
    hex_data: String
}

const BlockSchema = new Schema({
    id: String,
    block_num: String,
    timestamp: String,
    txn_count: Number,
    previous: String,
    transaction_mroot: String,
    action_mroot: String,
    block_mroot: String,
    producer: String,
    ref_block_prefix: String,
    new_producers: [String],
    producer_signature: String,
    regions: [{
        region: Number,
        cycles_summary: [[{
            read_locks: [{
                account: String,
                scope: String
            }],
            write_locks: [{
                account: String,
                scope: String
            }],
            transactions: [{
                status: String,
                id: String
            }]
        }]]
    }],
    input_transactions: [{
        signatures: [String],
        compression: String,
        hex_data: String,
        data: {
            expiration: String,
            region: Number,
            ref_block_num: String,
            ref_block_prefix: String,
            packed_bandwidth_words: Number,
            context_free_cpu_bandwidth: Number,
            context_free_actions: [action],
            actions: [action]
        }
    }]
    
}, { runSettersOnQuery: true });

//export module to use in server.js
const Block = module.exports = mongoose.model('Block', BlockSchema);