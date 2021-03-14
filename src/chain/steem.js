import steem from "../utils/steem";
import client from "../utils/dsteem";
import { PrivateKey } from "dsteem";
import steem_interface from "../utils/steem-interface";
import {
  RECENT_OPS_DURATION,
  MONITOR_POLLING_FREQUENCY,
  STEEM_SWAP_ACCOUNT,
  STEEM_MINE_ACCOUNT,
  STEEM_GAS_ACCOUNT,
  STEEM_TRANSACTON_FEE_MINIMUM,
  STEEM_TRANSACTION_FEE_MEMO_REGEX,
  STEEM_SWAP_ACCOUNT_KEY,
  STEEM_DAEMON_STATE_FILE,
  STEEM_MONITORING_MODE,
} from "../config";
import { loadData, saveData } from "../utils/data";
import { parseNumber } from "../utils/helper";

// History Mode

async function getAccountHistory(account, start, limit = 1000) {
  let data;
  try {
    data = await steem.api.getAccountHistoryAsync(account, start, limit);
  } catch (e) {
    console.log("Failed when fetching history. Retry...", e.message);
    data = await getAccountHistory(account, start, limit);
  }
  return data;
}

async function fetchLatestOperations(last = -1, limit = 100) {
  const account = STEEM_SWAP_ACCOUNT;
  const start = -1;
  let history = await getAccountHistory(account, start, limit);
  if (history && history.length > 0) {
    history = history.reverse();
    const latest = history[0][0];
    if (last > 0) {
      if (latest > last) {
        history = history.slice(0, latest - last);
      } else {
        history = [];
      }
    }
    return {
      history,
      index: latest,
    };
  } else {
    return {
      history: [],
      index: -1,
    };
  }
}

async function recentGatewayActions() {
  const state_file = STEEM_DAEMON_STATE_FILE;
  let { steem } = loadData(state_file);
  const last_history_op = (steem && steem.history && steem.history.index) || -1;
  const { history, index } = await fetchLatestOperations(last_history_op);
  if (history && history.length > 0) {
    const recent = history.filter((op) => {
      return (
        Date.now() - new Date(op[1].timestamp + "Z").getTime() <
        RECENT_OPS_DURATION * 1000
      );
    });
    steem = {
      ...steem,
      ...{
        history: {
          block: history[0] ? history[0][1].block : -1,
          timestamp: history[0] ? history[0][1].timestamp : "",
          index,
        },
      },
    };
    saveData(state_file, { steem });
    console.log(
      "STEEM Listener: fetched operations from index [%s] to [%s] : %s",
      last_history_op,
      index,
      JSON.stringify(recent)
    );
    return getActionsFromHistory(recent);
  } else {
    return [];
  }
}

function getActionsFromHistory(history) {
  const actions = [];
  if (history && history.length > 0) {
    history = history.reverse();
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const op = h[1].op;
      let valid = false;
      if (
        op[0] === "transfer" &&
        op[1].to === STEEM_GAS_ACCOUNT &&
        op[1].memo &&
        STEEM_TRANSACTION_FEE_MEMO_REGEX.test(op[1].memo) &&
        parseNumber(op[1].amount) >= STEEM_TRANSACTON_FEE_MINIMUM &&
        history[i + 1] &&
        history[i + 1][1]
      ) {
        const action = history[i + 1][1];
        if (h[1].trx_id === action.trx_id) {
          const m = op[1].memo.match(STEEM_TRANSACTION_FEE_MEMO_REGEX);
          const type = m[1];
          const address = m[2];
          if (type === action.op[0]) {
            action.op[1]._address = address;
            action.op[1]._fee = op[1].amount;
            actions.push(action.op);
            valid = true;
            i += 1; // jump to next operation
          }
        }
      }
      if (!valid) {
        // detect illegal operations
        if (
          // is delegation
          op[0] === "delegate_vesting_shares" &&
          op[1].delegatee === STEEM_MINE_ACCOUNT
        ) {
          const action = op;
          action[1]._illegal = true;
          actions.push(action);
          valid = false;
        }
      }
    }
  }
  return actions;
}

// Stream Mode

let feeOperation = null;

function getActionsFromOperation(operation) {
  const actions = [];
  if (operation) {
    let valid = false;
    const op = operation.op;
    if (
      // is fee operation ?
      op[0] === "transfer" &&
      op[1].to === STEEM_GAS_ACCOUNT &&
      op[1].memo &&
      STEEM_TRANSACTION_FEE_MEMO_REGEX.test(op[1].memo) &&
      parseNumber(op[1].amount) >= STEEM_TRANSACTON_FEE_MINIMUM &&
      !feeOperation
    ) {
      feeOperation = operation;
    } else if (feeOperation) {
      if (feeOperation.trx_id === operation.trx_id) {
        const action = op;
        const m = feeOperation.op[1].memo.match(
          STEEM_TRANSACTION_FEE_MEMO_REGEX
        );
        const type = m[1];
        const address = m[2];
        if (type === action[0]) {
          action[1]._address = address;
          action[1]._fee = feeOperation.op[1].amount;
          actions.push(action);
          valid = true;
        }
      }
      feeOperation = null;
    } else {
      feeOperation = null;
    }
    if (!valid) {
      // detect illegal operations
      if (
        // is delegation
        op[0] === "delegate_vesting_shares" &&
        op[1].delegatee === STEEM_MINE_ACCOUNT
      ) {
        const action = op;
        action[1]._illegal = true;
        actions.push(action);
        valid = false;
      }
    }
  }
  return actions;
}

function streamActions(callback) {
  steem_interface.stream({
    on_op: (op, block_num, block_id, previous_block, trx_id, timestamp) => {
      const actions = getActionsFromOperation({
        trx_id,
        op,
      });
      if (callback) callback(actions);
    },
  });
}

// Actions

export function monitorGatewayActions(callback) {
  const mode = STEEM_MONITORING_MODE;
  if (mode === "history") {
    // history mode
    const check = async () => {
      const actions = await recentGatewayActions();
      if (callback) callback(actions);
      setTimeout(check, MONITOR_POLLING_FREQUENCY * 1000); //
    };
    check();
  } else {
    // stream mode
    streamActions(callback);
  }
  console.log(`Steem Listener: Watch Gateway Actions in [${mode}] mode`);
}

export async function transfer(fromPolkadot, toSteem, amount, symbol, memo) {
  return await steem.broadcast.transferAsync(
    STEEM_SWAP_ACCOUNT_KEY,
    STEEM_SWAP_ACCOUNT,
    toSteem,
    amount + " " + symbol,
    memo
  );
}

export async function getGlobalProperties() {
  return await steem.api.getDynamicGlobalPropertiesAsync();
}

export async function vestToSteem(vestingShares) {
  const props = await getGlobalProperties();
  return steem.formatter.vestToSteem(
    vestingShares,
    props.total_vesting_shares,
    props.total_vesting_fund_steem
  );
}

export async function steemToVest(steemPower) {
  const props = await getGlobalProperties();
  const totalSteem = Number(props.total_vesting_fund_steem.split(" ")[0]);
  const totalVests = Number(props.total_vesting_shares.split(" ")[0]);
  return ((parseFloat(steemPower) * totalVests) / totalSteem).toFixed(6);
}

export async function delegate(
  privateKey,
  delegator,
  delegatee,
  vesting_shares,
  address,
  fee
) {
  vesting_shares = parseNumber(vesting_shares).toFixed(6) + " VESTS";
  return await broadcastWithFee(privateKey, delegator, address, fee, "STEEM", [
    "delegate_vesting_shares",
    {
      delegator,
      delegatee,
      vesting_shares,
    },
  ]);
}

export async function powerUp(key, from, to, amount) {
  return await steem.broadcast.transferToVestingAsync(key, from, to, amount);
}

export async function powerDown(key, account, vesting_shares) {
  vesting_shares = parseNumber(vesting_shares).toFixed(6) + " VESTS";
  return await steem.broadcast.withdrawVestingAsync(
    key,
    account,
    vesting_shares
  );
}

export const getAccountInfo = async (account) => {
  const results = await steem.api.getAccountsAsync([account]);
  if (results.length === 0) {
    return null;
  } else {
    return results[0];
  }
};

export const getVestingShares = async (username) => {
  const [account, expiring] = await Promise.all([
    getAccountInfo(username),
    getExpiringDelegation(username),
  ]);

  const staked = parseFloat(account.vesting_shares);
  const received = parseFloat(account.received_vesting_shares);
  const delegated = parseFloat(account.delegated_vesting_shares);
  const withdrawal = parseFloat(account.vesting_withdraw_rate);
  const total = staked + received - delegated - withdrawal;
  const available = staked - delegated - withdrawal;

  return {
    staked,
    received,
    delegated,
    expiring,
    withdrawal,
    total,
    available,
  };
};

export async function getOutgoingDelegation(delegator, delegatee) {
  const result = await steem.api.getVestingDelegationsAsync(
    delegator,
    "",
    1000
  );
  const delegated = result.filter((d) => d.delegatee === delegatee);
  if (delegated && delegated.length > 0) {
    return parseNumber(delegated[0].vesting_shares);
  } else {
    return 0;
  }
}

export async function getExpiringDelegation(username) {
  const data = await callDatabaseApi("find_vesting_delegation_expirations", {
    account: username,
  });
  if (data && data.delegations) {
    const delegations = data.delegations;
    let total = 0;
    delegations.forEach((d) => {
      if (d.vesting_shares) {
        total += d.vesting_shares.amount / 10 ** d.vesting_shares.precision;
      }
    });
    return total;
  }
  return 0;
}

function callDatabaseApi(method, params) {
  return new Promise(function (resolve, reject) {
    steem.api.call("database_api." + method, params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function broadcastWithFee(key, account, address, fee, symbol, operation) {
  const wif = PrivateKey.fromString(key);
  fee = parseFloat(fee).toFixed(3);
  const feeOperation = [
    "transfer",
    {
      from: account,
      to: STEEM_GAS_ACCOUNT,
      amount: fee + " " + symbol,
      memo: "fee: " + operation[0] + " " + address,
    },
  ];
  return await client.broadcast.sendOperations([feeOperation, operation], wif);
}
