import { b64uDec } from "./utils/helper";

// Daemon Config
export const RECENT_OPS_DURATION = 10 * 60; // seconds
export const MONITOR_POLLING_FREQUENCY = 10; // seconds
export const LOCAL_DATA_DIR = ".local";

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
  process.env.STEEM_SWAP_ACCOUNT || "dotnut.nutbox";
export const STEEM_SWAP_ACCOUNT_KEY = b64uDec(
  process.env.STEEM_SWAP_ACCOUNT_KEY || ""
);
export const STEEM_GAS_ACCOUNT = process.env.STEEM_GAS_ACCOUNT || "nutbox.gas";
export const STEEM_TRANSFER_MEMO_REGEX = /([a-zA-Z0-9]+) (?:\+|\-)\d+\.\d{3} DNUT/;
export const STEEM_TRANSACTION_FEE_MEMO_REGEX = /fee: ([a-z_]+) ([a-zA-Z0-9]+)/;
export const STEEM_TRANSACTON_FEE_MINIMUM =
  (process.env.STEEM_TRANSACTON_FEE_MINIMUM &&
    parseFloat(process.env.STEEM_TRANSACTON_FEE_MINIMUM)) ||
  0.001; // STEEM
export const STEEM_DAEMON_STATE_FILE =
  LOCAL_DATA_DIR + "/" + "daemon_steem_state.json";
export const STEEM_MONITORING_MODE =
  process.env.STEEM_MONITORING_MODE || "stream"; // [history, stream]

// Polkadot Config
export const DONUT_SWAP_ACCOUNT_KEY = b64uDec(
  process.env.DONUT_SWAP_ACCOUNT_KEY || ""
);
export const DONUT_ENDPOINT_URL =
  process.env.DONUT_ENDPOINT_URL || "wss://rpc.donut.nutbox.io";
export const DONUT_PRECISION = 10 ** 12;
