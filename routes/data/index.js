module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["corona", "corona.js"],
		["origin", "origin.js"]
	];

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	return Router;
})();