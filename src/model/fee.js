import { STAKING_FEE } from "../config";
import { parseNumber } from "../utils/helper";

const TRANSFER_FEE_CRITERIA = {
  STEEM: {
    minimum: 0.3,
    ratio: 0.002,
  },
  SBD: {
    minimum: 0.03,
    ratio: 0.002,
  },
};

const POWER_UP_FEE_CRITERIA = {
  STEEM: {
    minimum: 1,
    ratio: 0.002,
  },
};

export function verifyTransferFee(amount, fee) {
  const segs = amount.split(" ");
  if (segs && segs.length > 0) {
    const symbol = segs[1];
    if (fee.includes(symbol)) {
      amount = parseNumber(amount);
      fee = parseNumber(fee);
      return (
        fee >=
        parseFloat(
          Math.max(
            TRANSFER_FEE_CRITERIA[symbol].minimum,
            amount * TRANSFER_FEE_CRITERIA[symbol].ratio
          ).toFixed(3)
        )
      );
    }
  }
  return false;
}

export function verifyDelegationFee(amount, fee) {
  return fee && parseNumber(fee) >= STAKING_FEE;
}

export function verifyPowerUpFee(amount, fee) {
  const symbol = "STEEM";
  if (fee.includes(symbol)) {
    amount = parseNumber(amount);
    fee = parseNumber(fee);
    return (
      fee >=
      parseFloat(
        Math.max(
          POWER_UP_FEE_CRITERIA[symbol].minimum,
          amount * POWER_UP_FEE_CRITERIA[symbol].ratio
        ).toFixed(3)
      )
    );
  }
  return false;
}
