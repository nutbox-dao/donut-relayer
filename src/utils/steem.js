import steem from "steem";
import { STEEM_API_URLS as API_URLS } from "../config";

steem.api.setOptions({ url: API_URLS[0] });

export default steem;
