import { b64uDec } from "./utils/helper";

// Daemon Config
export const RECENT_OPS_DURATION = 10 * 60; // seconds
export const MONITOR_POLLING_FREQUENCY = 10; // seconds
export const LOCAL_DATA_DIR = ".local";

// App Config
export const NUTBOX_HOST_URL =
  process.env.NUTBOX_HOST_URL || "https://nutbox.io";

// Steem Config
export const STEEM_API_URLS = [
  process.env.STEEM_API_URL || "https://api.steemitdev.com",
  "https://cn.steems.top",
  "https://api.steemit.com",
  "https://steem.61bts.com",
  "https://api.justyy.com",
  "https://aksaiapi.wherein.mobi",
];
export const STEEM_SWAP_ACCOUNT =
  process.env.STEEM_SWAP_ACCOUNT || "nutbox.dex";
export const STEEM_SWAP_ACCOUNT_KEY = b64uDec(
  process.env.STEEM_SWAP_ACCOUNT_KEY || ""
);
export const STEEM_MINE_ACCOUNT =
  process.env.STEEM_MINE_ACCOUNT || "nutbox.mine";
export const STEEM_GAS_ACCOUNT = process.env.STEEM_GAS_ACCOUNT || "nutbox.gas";
export const STEEM_TSP_ACCOUNT = process.env.STEEM_TSP_ACCOUNT || "nutbox.tsp";
export const STEEM_TSP_ACCOUNT_KEY = b64uDec(
  process.env.STEEM_TSP_ACCOUNT_KEY || ""
);
export const STEEM_TRANSFER_MEMO_REGEX = /([a-zA-Z0-9]+) (?:\+|\-)\d+\.\d{3} T(?:STEEM|SBD)/;
export const STEEM_TRANSACTION_FEE_MEMO_REGEX = /fee: ([a-z_]+) ([a-zA-Z0-9]+)/;
export const STEEM_TRANSACTON_FEE_MINIMUM =
  (process.env.STEEM_TRANSACTON_FEE_MINIMUM &&
    parseFloat(process.env.STEEM_TRANSACTON_FEE_MINIMUM)) ||
  0.001; // STEEM
export const STEEM_DAEMON_STATE_FILE =
  LOCAL_DATA_DIR + "/" + "daemon_steem_state.json";
export const STEEM_MONITORING_MODE =
  process.env.STEEM_MONITORING_MODE || "history"; // [history, stream]

// Tron Config
export const TRON_MINE_ACCOUNT_KEY = b64uDec(
  process.env.TRON_MINE_ACCOUNT_KEY || ""
);
export const TRON_SWAP_ACCOUNT_KEY = b64uDec(
  process.env.TRON_SWAP_ACCOUNT_KEY || ""
);
export const TRON_DAEMON_ACCOUNT_KEY = b64uDec(
  process.env.TRON_DAEMON_ACCOUNT_KEY || ""
);
export const TRON_NETWORK_URL =
  process.env.TRON_NETWORK_URL || "https://api.trongrid.io";
export const TRON_LIQUIDITY_POOL_ACCOUNT =
  process.env.TRON_LIQUIDITY_POOL_ACCOUNT ||
  "TNJQ12KujHQCJHMj2ZHLCesNtqBaHZMqTT";
export const TRON_API_KEY = process.env.TRON_API_KEY || "";

// Fee Model

export const STAKING_FEE =
  (process.env.STAKING_FEE && parseFloat(process.env.STAKING_FEE)) || 1; // STEEM
