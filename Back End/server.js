const app = require("./app.js");
const port = 3000;

app.listen(port, () =>
  console.log(`Server Started on http://127.0.0.1:${port}`)
);
