import fs from "fs";
import { monitorGatewayActions } from "./chain/steem";
import {
  getAddress as getTronAddr,
  intToAmount,
  synchronizeContracts,
} from "./chain/tron";
import { wrap as wrapAsSteem, unwrap as unwrapAsSteem } from "./token/tsteem";
import {
  wrap as wrapAsTSP,
  unwrap as unwrapAsTSP,
  pollingPowerDown,
  runTspDailyJobs,
  monitorTspLiquidityPool,
  monitorTspPoolEventByPolling,
  withdrawPeanuts,
  updateVestsToSteemRatio,
} from "./token/tsp";
import { watchEvent } from "./chain/event";
import { updateStaking, cancelStaking } from "./token/peanut";
import {
  LOCAL_DATA_DIR,
  STEEM_SWAP_ACCOUNT,
  STEEM_MINE_ACCOUNT,
  STEEM_TSP_ACCOUNT,
  STEEM_TRANSFER_MEMO_REGEX,
  TRON_TSTEEM_CONTRACT_ADDR,
} from "./config";
import { parseNumber } from "./utils/helper";
import {
  verifyTransferFee,
  verifyDelegationFee,
  verifyPowerUpFee,
} from "./model/fee";

// create .local data storage
function initLocalStore() {
  const dir = LOCAL_DATA_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// 1. STEEM to TSTEEM monitor && SBD to TSBD monitor
// 2. Delegation Mining monitor
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

async function wrapToTSP(powerUp) {
  let { from, to, amount, _address, _fee } = powerUp;
  if (!to || to !== STEEM_TSP_ACCOUNT) {
    console.error(
      "Failed to wrap to TSP. The power up was mistakenly sent to @%s",
      to
    );
    return;
  }
  if (!verifyPowerUpFee(amount, _fee)) {
    console.error(
      "Failed to wrap to TSP. Insufficient fee [%s] for transfer amount: [%s]",
      _fee,
      amount
    );
    return;
  }
  return await wrapAsTSP(from, _address, amount);
}

async function updateDelegationMining(delegation) {
  const {
    delegator,
    delegatee,
    vesting_shares,
    _address,
    _fee,
    _illegal,
  } = delegation;
  if (!delegatee || delegatee !== STEEM_MINE_ACCOUNT) {
    console.error(
      "Failed to update staking mining. The delegation was mistakenly made to @%s",
      delegatee
    );
    return;
  }
  const vests = parseNumber(vesting_shares).toFixed(6);
  if (!_fee || !verifyDelegationFee(vests, _fee)) {
    console.error(
      "Illegal staking mining by @%s. Insufficient fee [%s] for delegation vests: [%s]",
      delegator,
      _fee,
      vests
    );
    return await cancelStaking(delegator);
  } else {
    return await updateStaking(delegator, _address, vests);
  }
}

async function processAction(action, retries = 2) {
  const type = action[0];
  const params = action.length > 1 ? action[1] : {};
  try {
    if (type === "transfer" && params.to === STEEM_SWAP_ACCOUNT) {
      await wrapSteem(params);
    } else if (
      type === "transfer_to_vesting" &&
      params.to === STEEM_TSP_ACCOUNT
    ) {
      await wrapToTSP(params);
    } else if (type === "delegate_vesting_shares") {
      await updateDelegationMining(params);
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

// TSTEEM to STEEM conversion
async function unwrapSteem(unwrappred, symbol) {
  const result = unwrappred.result;
  const fromTron = getTronAddr(result[1]);
  const toSteem = result[0];
  const amount = intToAmount(result[2]);
  symbol =
    symbol ||
    (TRON_TSTEEM_CONTRACT_ADDR === unwrappred.contract ? "STEEM" : "SBD");
  await unwrapAsSteem(fromTron, toSteem, amount, symbol);
  console.log(
    "unwrap %s to @%s by [%s]",
    amount + " " + symbol,
    toSteem,
    fromTron
  );
}

// TSP to STEEM conversion
async function unwrapTSP(unwrappred, symbol) {
  const result = unwrappred.result;
  const fromTron = getTronAddr(result[1]);
  const toSteem = result[0];
  const amount = intToAmount(result[2]);
  await unwrapAsTSP(fromTron, toSteem, amount);
  console.log("unwrap %s to @%s by [%s]", amount + " VESTS", toSteem, fromTron);
}

async function monitorUnwrappingEvents() {
  await Promise.all([
    watchEvent(unwrapSteem, "STEEM"),
    watchEvent(unwrapSteem, "SBD"),
    watchEvent(unwrapTSP, "SP"),
  ]);
}

async function monitorTspLpBalance() {
  await watchEvent(withdrawPeanuts, "TSP_LP");
}

async function monitorTspPoolEvent() {
  await monitorTspPoolEventByPolling(withdrawPeanuts, "TSP_POOL");
}

async function main() {
  console.log("<<==**~~**==|  TSTEEM Daemon launched  |==**~~**==>>");
  initLocalStore();
  monitorSteemGateway();
  monitorUnwrappingEvents();
  pollingPowerDown();

  // TSP LP related tasks
  runTspDailyJobs();
  monitorTspLpBalance();
  monitorTspLiquidityPool();
  monitorTspPoolEvent();

  // synchronize contracts
  if (process.env.EXECUTION_MODE === "alpha") {
    synchronizeContracts();
  }
}

main();
