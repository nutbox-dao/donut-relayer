import fs from "fs";
import { monitorGatewayActions } from "./chain/steem";
import { wrap as wrapAsSteem, unwrap as unwrapAsSteem } from "./token/dnut";
import { connect as connectDonut, watchEvent } from "./chain/donut";
import {
  LOCAL_DATA_DIR,
  STEEM_SWAP_ACCOUNT,
  STEEM_TRANSFER_MEMO_REGEX,
  DONUT_PRECISION,
} from "./config";
import { verifyTransferFee } from "./model/fee";

// create .local data storage
function initLocalStore() {
  const dir = LOCAL_DATA_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// wrap STEEM into DNUT in Donut Chain
async function wrapSteem(transfer) {
  let { from, to, amount, memo, _fee } = transfer;
  if (!to || to !== STEEM_SWAP_ACCOUNT) {
    console.error(
      "Failed to wrap Steem. The transfer was mistakenly sent to @%s",
      to
    );
    return;
  }
  if (!verifyTransferFee(amount, _fee)) {
    console.error(
      "Failed to wrap Steem. Insufficient fee [%s] for transfer amount: [%s]",
      _fee,
      amount
    );
    return;
  }
  const match = memo.match(STEEM_TRANSFER_MEMO_REGEX);
  if (!match || !match[1]) {
    console.error("Failed to wrap Steem. Incorrect memo format: [%s]", memo);
    return;
  }
  const address = match[1];
  return await wrapAsSteem(from, address, amount);
}

async function processAction(action, retries = 2) {
  const type = action[0];
  const params = action.length > 1 ? action[1] : {};
  try {
    if (type === "transfer" && params.to === STEEM_SWAP_ACCOUNT) {
      await wrapSteem(params);
    } else {
      console.log("unsupported action [%s]", type);
    }
  } catch (e) {
    console.error("Failed when processing the action", action, e);
    const should_retry = e && e.error && e.error === "SERVER_BUSY";
    // retry if process action failed
    if (should_retry && retries > 0) {
      console.log(`Retry processing action: [${retries}]`, action);
      setTimeout(async () => {
        await processAction(action, retries - 1);
      }, 3000);
    }
  }
}

async function monitorSteemGateway() {
  monitorGatewayActions(async (actions) => {
    if (actions && actions.length > 0) {
      console.log("Process gateway actions", actions);
      actions.forEach(async (a) => await processAction(a));
      // avoid parallel execution which may cause issues
      // await Promise.all(actions.map((a) => processAction(a)));
    }
  });
}

// DNUT to STEEM conversion
async function unwrapSteem(event, symbol = "STEEM") {
  let args = [];
  event.data.forEach((data, index) => {
    args.push(data.toString());
  });

  // DonutBurned: Donut Account/Steem Account/Amount
  const fromPolkadot = args[0];
  const toSteem = Buffer.from(args[1].slice(2), "hex").toString();
  const amount = args[2] / DONUT_PRECISION;

  console.log("Details of event DonutBurned ");
  console.log(`\t\tDonut Account: ${fromPolkadot}`);
  console.log(`\t\tSteem Account: ${toSteem}`);
  console.log(`\t\tBurned Amount: ${amount} ${args[2]} ${DONUT_PRECISION}`);

  await unwrapAsSteem(fromPolkadot, toSteem, amount, symbol);

  console.log(
    "unwrap %s to @%s by [%s]",
    amount + " " + symbol,
    toSteem,
    fromPolkadot
  );
}

async function monitorDonutEvents() {
  connectDonut(() => {
    // DNUT burning happened
    watchEvent("DonutBurned", unwrapSteem);
  });
}

async function main() {
  console.log("<<==**~~**==|  DONUT Daemon launched  |==**~~**==>>");
  initLocalStore();
  monitorSteemGateway();
  monitorDonutEvents();
}

main();
