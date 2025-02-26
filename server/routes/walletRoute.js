const express = require("express");
const {
  fetchTokenBalance,
} = require("../controllers/tokenController");

const router = express.Router();

router.route("/balance").post(fetchTokenBalance);

module.exports = router;
