# eosio-blockAPI
by Vikram Melkote

## Description
A GraphQL API using node.js and express.js to fetch recent blocks from the EOS blockchain 

## Usage
1) in project directory: `docker-compose up --build`
2) Navigate to http://localhost:3001/blocks in a web browser
3) Input query examples:
   
   ### basic query:
   ```GraphQL
    {
      lastBlock {
        id
        timestamp
        txn_count
        block_num
      }
      blocks(numbers: [1, 4]){
        id
        timestamp
        txn_count
        block_num
      }
    }
    ```
   ### full query:
   ```GraphQL
    {
      blocks(numbers: [241, 142, 24]) {
        id
        timestamp
        block_num
		    txn_count
        ref_block_prefix
        regions {
          region
          cycles_summary {
            read_locks {
              account
              scope
            }
            write_locks {
              account
              scope
            }
            transactions {
              status
              id
            }
          }
        }
        input_transactions {
          signatures
          compression
          hex_data
          data {
            expiration
            region
            ref_block_num
            ref_block_prefix
            packed_bandwidth_words
            context_free_actions {
              account
              name
              authorization {
                actor
                permission
              }
              data {
                to
                from
                quantity
                memo
              }
              hex_data
            }
            context_free_cpu_bandwidth
            actions {
              account
              name
              authorization {
                actor
                permission
              }
              data {
                to
                from
                quantity
                memo
              }
              hex_data
            }
          }
        }
      }
    }
   ```
   
   ... or anything in between, eg:
   ```GraphQL
    {
      blocks(numbers: [4]) {
        id
        block_num
        timestamp
        input_transactions {
          hex_data
        }
      }
      lastBlock{
        id
        block_num
      }
    }
   ```
   
### Check blocks in cache:
1) `docker exec -it mongo /bin/bash`
2) `mongo`
3) `use blocks`
4) `db.blocks.find()`
