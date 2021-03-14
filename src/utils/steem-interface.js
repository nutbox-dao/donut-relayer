import steem_interface from "steem-interface";
import { STEEM_API_URLS } from "../config";

steem_interface.init({
  rpc_nodes: STEEM_API_URLS,
});

export default steem_interface;
