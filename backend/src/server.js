const dotenv = require("dotenv");
const app = require("./app");
const connectMongo = require("./config/db");

dotenv.config();

const PORT = process.env.PORT || 5000;

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
