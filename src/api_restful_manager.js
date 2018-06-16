/*
	[api_restful_manager.js]

	encoding=utf-8
*/
const api_clearly = require("./api_clearly.js");
const api_sql = require("./api_sql_tiny.js");
const api_enumerate = require("./api_sql_enumerate.js");



exports.api_v1_summarylist = api_clearly.api_v1_summarylist;


exports.api_v1_show = api_sql.api_v1_show;
exports.api_v1_sql = api_sql.api_v1_sql;


exports.api_v1_batterylog_add = api_sql.api_v1_batterylog_add;
exports.api_v1_batterylog_show = api_sql.api_v1_batterylog_show;
exports.api_v1_batterylog_delete = api_sql.api_v1_batterylog_delete;

exports.api_v1_serial_grant = api_enumerate.api_v1_serialpath_grant;


