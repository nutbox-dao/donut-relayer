import { BlockchainMode, Client } from "dsteem";
import { STEEM_API_URLS } from "../config";

const client = new Client(STEEM_API_URLS[0]);

export const STREAM_MODE = BlockchainMode;

export default client;
