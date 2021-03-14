import fs from "fs";

export function loadData(filename) {
  if (fs.existsSync(filename)) {
    const data = fs.readFileSync(filename);
    if (data) {
      return JSON.parse(data);
    }
  }
  return {};
}

export function saveData(filename, data) {
  const saved = loadData();
  data = { ...saved, ...data };
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  // console.log("saved data to", filename);
}
