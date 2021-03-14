import {
  getContract,
  amountToInt,
  contractConfig,
  isTransactionSuccess,
} from "../chain/tron";
import { parseNumber } from "../utils/helper";
import { transfer } from "../chain/steem";

export async function wrap(from, to, amount) {
  const symbol = amount.split(" ")[1];
  const contract = await getContract(symbol);
  amount = parseNumber(amount).toFixed(3);
  const method = symbol === "STEEM" ? "steemToTsteem" : "sbdToTsbd";
  const int = amountToInt(amount);
  const res = await contract[method](from, to, int).send(contractConfig);
  if (res && (await isTransactionSuccess(res))) {
    console.log(
      "@%s wrap [%s %s] to address [%s]; trx = [%s]",
      from,
      amount,
      symbol,
      to,
      res
    );
    return true;
  } else {
    return false;
  }
}

export async function unwrap(fromTron, toSteem, amount, symbol) {
  amount = parseNumber(amount).toFixed(3);
  const memo = `${fromTron} -${amount} T${symbol}`;
  return await transfer(fromTron, toSteem, amount, symbol, memo);
}
