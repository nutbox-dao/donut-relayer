export const parseNumber = (v) => {
  if (typeof v === "string") {
    v = v.replace(/[,%$]+/g, "");
  }
  return parseFloat(v);
};

const b64uLookup = {
  "/": "_",
  _: "/",
  "+": "-",
  "-": "+",
  "=": ".",
  ".": "=",
};
export const b64uEnc = (str) =>
  Buffer.from(str)
    .toString("base64")
    .replace(/(\+|\/|=)/g, (m) => b64uLookup[m]);
export const b64uDec = (str) =>
  Buffer.from(
    str.replace(/(-|_|\.)/g, (m) => b64uLookup[m]),
    "base64"
  ).toString();
