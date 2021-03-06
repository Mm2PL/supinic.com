/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Throughput = require("../../modules/messages.js");
	const Channel = require("../../modules/chat-data/channel.js");

	Router.get("/", async (req, res) => {
		const { data: rawData } = await sb.Got.instances.Supinic("bot/channel/list").json();

		// Use all non-Discord channels, and only show Discord channels with a description
		// Those who aren't are most likely inactive.
		const data = rawData.filter(i => i.platformName !== "Discord" || i.description).map(i => ({
			Name: (i.platformName === "Discord")
				? (i.description || "(unnamed discord channel)")
				: i.name,
			Mode: i.mode,
			Platform: i.platformName,
			LineCount: {
				dataOrder: i.lineCount,
				value: String(i.lineCount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
			},
			ByteLength: {
				dataOrder: i.byteLength,
				value: (i.byteLength >= 1e9)
					? (sb.Utils.round(i.byteLength / 1e9, 3) + " GB")
					: (i.byteLength >= 1e6)
						? (sb.Utils.round(i.byteLength / 1e6, 3) + " MB")
						: (sb.Utils.round(i.byteLength / 1e3, 0) + " kB")
			},
			ID: `<a href="/bot/channels/${i.ID}/activity">${i.ID}</a>`
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	Router.get("/:name-:id/activity", async (req, res) => {
		const tableList = await Throughput.getList();
		const channelID = Number(req.params.id);
		const channelName = String(req.params.name).toLowerCase();

		const channelData = tableList.find(i => i.ID === channelID && i.Name === channelName);
		if (!channelData) {
			return res.status(404).render("error", {
				error: "404",
				message: "Target channel has no activity data"
			});
		}

		if (typeof sb.App.cache.channelActivity === "undefined") {
			sb.App.cache.channelActivity = {};
		}

		const [lastHourData, lastDayData, lastMonthData] = await Promise.all([
			Throughput.lastHour(channelData.ID),
			Throughput.lastDay(channelData.ID),
			(async () => sb.App.cache.channelActivity[channelID] ?? await Throughput.lastMonth(channelData.ID))()
		]);

		if (typeof sb.App.cache.channelActivity[channelID] === "undefined") {
			sb.App.cache.channelActivity[channelID] = lastMonthData;
		}

		let minuteData = [];
		let hourData = [];
		let dayLabels = [];
		let dayData = [];

		for (const row of lastHourData) {
			minuteData.push(Number(row.Amount));
		}

		for (const row of lastDayData) {
			hourData.push(Number(row.Amount));
		}

		for (const row of lastMonthData) {
			dayLabels.push(new sb.Date(row.Timestamp).format("D j.n.Y"));
			dayData.push(Number(row.Amount));
		}

		res.render("channel-activity", {
			minuteData: JSON.stringify(minuteData),
			hourData: JSON.stringify(hourData),
			dayData: JSON.stringify(dayData),
			dayLabels: JSON.stringify(dayLabels),
			channelName: channelName
		});
	});

	return Router;
})();
	