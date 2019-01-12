/*
    [api_sql_tiny.js]
    
	encoding=utf-8
*/

var debug = require("./debugger.js");
require('date-utils'); // Data() クラスのtoString()を拡張してくれる。

var lib = require("./factory4require.js");
var factoryImpl = { // require()を使う代わりに、new Factory() する。
    "mssql" : new lib.Factory4Require("mssql")  // https://www.npmjs.com/package/mssql
};

// UTデバッグ用のHookポイント。運用では外部公開しないメソッドはこっちにまとめる。
exports.factoryImpl = factoryImpl;




/**
 * 情報表示API：　バージョン表示など
 */
exports.api_v1_show = function( queryFromGet, dataFromPost ){
console.log( queryFromGet );
	var name = queryFromGet[ "name" ];
	if( name == "version" ){
		return Promise.resolve({
			"jsonData" : { "version" : "1.00" },
			"status" : 200 // OK 【FixMe】直前までの無いように応じて変更する。
		});
	} else {
		return Promise.resolve({
			"jsonData" : { result : "show api is here." },
			"status" : 200 // OK 【FixMe】直前までの無いように応じて変更する。
		});
	}
};

var _SQL_CONNECTION_CONFIG = require("./sql_config.js");
factoryImpl[ "CONFIG_SQL" ] = new lib.Factory(_SQL_CONNECTION_CONFIG.CONFIG_SQL);





/**
 * SQL Server への接続テストAPI
 */
exports.api_v1_sql = function( queryFromGet, dataFromPost ){
	var mssql = factoryImpl.mssql.getInstance();
	var config = factoryImpl.CONFIG_SQL.getInstance();
	var connect = mssql.connect( config );

	return connect.then(function(){
		// 何もしない。
	}).catch(function(err){
		return Promise.resolve({
			"jsonData" : err,
			"status" : 500 // Internal Error。
		});
	}).then(function(){
		mssql.close();
		return Promise.resolve({
			"jsonData" : { "result" : "sql connection is OK!" },
			"status" : 200 // OK
		});
	});
};






