const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const { cryptoWaitReady } = require("@polkadot/util-crypto");
const BN = require("bn.js");
const {
  DONUT_ENDPOINT_URL,
  DONUT_SWAP_ACCOUNT_KEY,
  DONUT_PRECISION,
} = require("../config");

const custrom_types = {};

const provider = new WsProvider(DONUT_ENDPOINT_URL);
const api = new ApiPromise({ provider, types: custrom_types });
let nonce = 0;

export const connect = async (callback) => {
  console.log("Start connecting Donut ...");
  api.on("connected", () => console.log("Donut Connection established"));
  api.on("error", (err) => console.log("Donut API connection failed: ", err));
  api.on("ready", async () => {
    console.log("Donut API is ready");

    // Retrieve the chain & node information information via rpc calls
    const [nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.name(),
      api.rpc.system.version(),
    ]);

    console.log(`We have connected to ${nodeName}-v${nodeVersion}`);

    await cryptoWaitReady();
    if (callback) {
      callback();
    }
  });
};

export const issueDonut = async (steemAccount, donutAccount, amount) => {
  const keyring = new Keyring({ type: "sr25519" });
  // alice is sudo on test mode
  const sudo_account = keyring.addFromUri(DONUT_SWAP_ACCOUNT_KEY);
  const donut_account = keyring.addFromAddress(donutAccount);
  const steem_account = "0x" + Buffer.from(steemAccount).toString("hex");
  const bridge_sig = "0x" + Buffer.from("dummy signature").toString("hex");
  const bn_decimals = new BN(api.registry.chainDecimals[0]);

  console.log(
    "--- Submitting extrinsic to issue DNUT into donut account: ",
    donut_account.address,
    " ---"
  );

  return new Promise(async (resolve, reject) => {
    if (!nonce) {
      nonce = (
        await api.query.system.account(sudo_account.address)
      ).nonce.toNumber();
    }
    const unsub = await api.tx.sudo
      .sudo(
        api.tx.donutCore.sudoIssueDonut(
          donut_account.address,
          steem_account,
          new BN(amount * DONUT_PRECISION),
          bridge_sig
        )
      )
      .signAndSend(sudo_account, { nonce: nonce, era: 0 }, (result) => {
        // console.log(`Current status is ${result.status}`);
        if (result.status.isInBlock) {
          console.log(
            `Transaction included at blockHash ${result.status.asInBlock}`
          );
        } else if (result.status.isFinalized) {
          console.log(
            `Transaction finalized at blockHash ${result.status.asFinalized}`
          );
          unsub();
          return resolve(result.status.asFinalized);
        }
      })
      .catch((err) => reject(err));
    nonce += 1;
  });
};

export const burnDonut = async () => {
  console.log(
    "--- Submitting extrinsic to burn DNUT from donut account: ",
    donut_account.address,
    " ---"
  );

  return new Promise(async (resolve, reject) => {
    if (!nonce) {
      nonce = (
        await api.query.system.account(sudo_account.address)
      ).nonce.toNumber();
    }
    const unsub = await api.tx.sudo
      .sudo(
        api.tx.donutCore.sudoBurnDonut(
          donut_account.address,
          steem_account,
          new BN(100000000000000),
          bridge_sig
        )
      )
      .signAndSend(sudo_account, { nonce: nonce, era: 0 }, (result) => {
        console.log(`Current status is ${result.status}`);
        if (result.status.isInBlock) {
          console.log(
            `Transaction included at blockHash ${result.status.asInBlock}`
          );
        } else if (result.status.isFinalized) {
          console.log(
            `Transaction finalized at blockHash ${result.status.asFinalized}`
          );
          unsub();
          return resolve(result.status.asFinalized);
        }
      })
      .catch((err) => reject(err));
    nonce += 1;
  });
};

export const watchEvent = (method, callback) => {
  // Subscribe to system events and look up events we care
  api.query.system.events((events) => {
    // console.log(`\nReceived ${events.length} events:`)

    // Loop through the Vec<EventRecord>
    events.forEach((record) => {
      // Extract the phase, event and the event types
      const { event, phase } = record;
      const types = event.typeDef;

      if (event.method === method) {
        callback(event);
      }
    });
  });
};
