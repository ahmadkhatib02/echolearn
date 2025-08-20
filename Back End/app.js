const express = require("express");
const dotenv = require("dotenv");

const { validateMessage, generateFlashCard } = require("./apiControllers.js");

dotenv.config({ path: "./config.env" });
const app = express();

//Middlewares
app.use(express.json());
app.use(express.static(`${__dirname}/../Front End/dist`));

//Routers
app.post("/api/flashcard", validateMessage, generateFlashCard);

module.exports = app;
