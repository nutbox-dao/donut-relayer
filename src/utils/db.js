const mongodb = require("mongodb");

module.exports.init = function (callback) {
  mongodb.MongoClient.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/test",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    function (err, client) {
      if (err) {
        console.log(err);
        process.exit(1);
      }

      // Save database object from the callback for reuse.
      const db = client.db();
      console.log("Database connection ready");

      module.exports.client = client;
      module.exports.db = db;

      if (callback) callback(client);
    }
  );
};

module.exports.collections = {
  POWER_DOWN: "power_down",
  LOG: "log",
};
