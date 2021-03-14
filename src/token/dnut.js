import { issueDonut } from "../chain/donut";
import { parseNumber } from "../utils/helper";
import { transfer } from "../chain/steem";

export async function wrap(fromSteem, toPolkadot, amount) {
  const symbol = amount.split(" ")[1];
  amount = parseNumber(amount).toFixed(3);
  const res = await issueDonut(fromSteem, toPolkadot, amount);
  if (res) {
    console.log(
      "@%s wrap [%s %s] to address [%s]; result = [%s]",
      fromSteem,
      amount,
      symbol,
      toPolkadot,
      res
    );
    return true;
  } else {
    return false;
  }
}

export async function unwrap(fromPolkadot, toSteem, amount, symbol) {
  amount = parseNumber(amount).toFixed(3);
  const memo = `${fromPolkadot} -${amount} DNUT`;
  return await transfer(fromPolkadot, toSteem, amount, symbol, memo);
}
