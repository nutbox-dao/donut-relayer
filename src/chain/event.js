import {
  getContract,
  getEvents,
  CONTRACT_EVENTS,
  getAnyRecentEvent,
} from "./tron";
import {
  TRON_TSTEEM_STATE_FILE,
  TRON_TSBD_STATE_FILE,
  TRON_TSP_STATE_FILE,
  TRON_TSP_LP_STATE_FILE,
} from "../config";
import { loadData, saveData } from "../utils/data";

const lastEvent = {
  STEEM: null,
  SBD: null,
  SP: null,
  TSP_LP: null,
};

const STATE_FILES = {
  STEEM: TRON_TSTEEM_STATE_FILE,
  SBD: TRON_TSBD_STATE_FILE,
  SP: TRON_TSP_STATE_FILE,
  TSP_LP: TRON_TSP_LP_STATE_FILE,
};

function loadEvent(symbol) {
  const state_file = STATE_FILES[symbol];
  let data = loadData(state_file);
  if (data && data.event && data.event.last) {
    lastEvent[symbol] = parseInt(data.event.last);
  } else {
    lastEvent[symbol] = Date.now();
  }
}

function saveEvent(symbol, timestamp) {
  const state_file = STATE_FILES[symbol];
  lastEvent[symbol] = timestamp;
  saveData(state_file, { event: { last: timestamp } });
}

async function getRecentEvents(symbol) {
  try {
    const events = await getEvents(symbol, 10);
    if (events && events.length > 0) {
      const lastTime = lastEvent[symbol];
      saveEvent(symbol, events[0].timestamp);
      if (lastTime) {
        return events.filter((e) => e.timestamp > lastTime);
      }
    }
  } catch (e) {
    console.error(
      `Error with loading [${symbol}] contract's event:`,
      e.message
    );
  }
  return null;
}

export const getRecentEventInPast24H = async (symbol) => {
  try {
    const event = await getAnyRecentEvent(symbol);
    if (event && event.length > 0) {
      const timeStamp = Date.now();
      const recentEventTimeStamp = event[0].timestamp;
      if (
        recentEventTimeStamp &&
        timeStamp - recentEventTimeStamp < 24 * 60 * 60 * 1000
      ) {
        return event[0];
      }
    }
  } catch (e) {
    console.error(
      `Error with loading [${symbol}] contract's recent event:`,
      e.message
    );
  }
  return null;
};

async function watchEventByPolling(callback, symbol = "STEEM") {
  const wrapped_symbol = symbol.charAt(0) === "T" ? symbol : `T${symbol}`;
  console.log(
    `Tron Event Polling: Watch the event of ${wrapped_symbol} contract`
  );
  const update = async (symbol) => {
    const events = await getRecentEvents(symbol);
    if (events && events.length > 0) {
      for (const res of events) {
        console.log("Process Event by Polling:", res);
        if (callback) {
          callback(res, symbol);
        }
      }
    }
    setTimeout(() => {
      update(symbol);
    }, 30000); // polling every 30s
  };
  update(symbol);
}

async function watchEventByListener(callback, symbol = "STEEM") {
  const contract = await getContract(symbol);
  const event = CONTRACT_EVENTS[symbol];
  const wrapped_symbol = symbol.charAt(0) === "T" ? symbol : `T${symbol}`;
  console.log(
    `Tron Event Listener: Watch [${event}] event of ${wrapped_symbol} contract`
  );
  contract[event]().watch((err, res) => {
    if (err) {
      console.error(`Error with [${event}] event:`, err.message || err.error);
    }
    if (res && res.result && res.name === event) {
      const lastTime = lastEvent[symbol];
      if (!lastTime || res.timestamp > lastTime) {
        saveEvent(symbol, res.timestamp);
        console.log("Process Event by Listener:", res);
        if (callback) {
          callback(res, symbol);
        }
      }
    }
  });
}

export function watchEvent(callback, symbol = "STEEM") {
  loadEvent(symbol);
  watchEventByListener(callback, symbol);
  watchEventByPolling(callback, symbol);
}
