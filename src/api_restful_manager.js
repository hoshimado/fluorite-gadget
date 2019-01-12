/*
	[api_restful_manager.js]

	encoding=utf-8
*/
const api_clearly = require("./api_clearly.js");
const api_sql = require("./api_sql_tiny.js");

// ***********************
// 以下でexportしたメソッドが「_⇒/」で置き換えたURLでAPIとして提供される。
// ***********************

// 両手たぶメモで利用する、サブトート簡易Google検索API
exports.api_v1_summarylist = api_clearly.api_v1_summarylist;

// 動作検証用のHello worldのAPI。
exports.api_v1_show = api_sql.api_v1_show;

// ローカルでのMS SQL検証用API。Azure側ではAzure SQLは停止中（2019.1.1～）なので、動作しない。
exports.api_v1_sql = api_sql.api_v1_sql;


