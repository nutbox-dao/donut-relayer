# donut-daemon
The Donut Damon that bridges Polkadot and Steem blockchains

## Install

```bash
cd donut-daemon
yarn
```
## Configure

Set environment variable following **.env.example** as an example and save as **.env**

```env
STEEM_SWAP_ACCOUNT=donut.nutbox
STEEM_SWAP_ACCOUNT_KEY=...
DONUT_SWAP_ACCOUNT_KEY=...
STEEM_MONITORING_MODE=stream
STEEM_API_URL=https://api.steemit.com
DONUT_ENDPOINT_URL=wss://donut.nutbox.io
STEEM_TRANSACTON_FEE_MINIMUM=0.001
```

## Execute

### Testing

```bash
yarn start
```

### Production

```bash
pm2 start
```
