/*
    [api_sql_enumerate.js]
	encoding=utf-8
*/


var debug = require("./debugger.js");
require('date-utils'); // Data() クラスのtoString()を拡張してくれる。

var lib = require("./factory4require.js");
var factoryImpl = { // require()を使う代わりに、new Factory() する。
    "mssql" : new lib.Factory4Require("mssql"),  // https://www.npmjs.com/package/mssql
    "sql_parts" : new lib.Factory4Require("./sql_parts.js")
};
var _SQL_CONNECTION_CONFIG = require("./sql_config.js");
factoryImpl[ "CONFIG_SQL" ] = new lib.Factory(_SQL_CONNECTION_CONFIG.CONFIG_SQL);


// UTデバッグ用のHookポイント。運用では外部公開しないメソッドはこっちにまとめる。
exports.factoryImpl = factoryImpl;


var openSqlQyery = function(){
	var mssql = factoryImpl.mssql.getInstance();
	return new mssql.Request();
};
var closeSqlQuery = function(){
	var mssql = factoryImpl.mssql.getInstance();
	mssql.close();
};
factoryImpl["simple_sql"] = new lib.Factory({
	"open"  : openSqlQyery,
	"close" : closeSqlQuery
});



var grantPathFromSerialNumber = function( sqlConnection, databaseName, serialNumber ){
	var query_str = "SELECT [id], [serial], [called], [max_entrys], [url]";
	query_str += " FROM [" + databaseName + "].dbo.[redirect_serial]";
	query_str += " WHERE [serial]='" + serialNumber + "'"

	return sqlConnection.query( query_str ).then(function(result){
		var item = result[0] ? result[0] : null;

		if( item ){
			return Promise.resolve({
				"path" : item.url.trim(),
				"called" : item.called,
				"max_entrys" : item.max_entrys
			});
		}else{
			return Promise.reject("Invalid Serial Key.");
		}
	}).catch(function(){
		return Promise.reject("failed to query1.");
	});
};


var updateCalledWithTargetSerial = function( sqlConnection, databaseName, serialNumber, grantedPath, currentCalledCount, maxEntrys ){
	var query_str = "UPDATE [" + databaseName + "].[dbo].[redirect_serial]";
	query_str += " SET [called]=" + currentCalledCount;
	query_str += " WHERE [serial]='" + serialNumber + "'"

	return sqlConnection.query( query_str ).then(function(){
		return Promise.resolve({
			"path" : grantedPath,
			"left" : maxEntrys - currentCalledCount
		});
	}).catch(function(){
		return Promise.reject("failed to query2.");
	});
};

factoryImpl["grantPath"] = new lib.Factory( grantPathFromSerialNumber );
factoryImpl["updateCalled"] = new lib.Factory( updateCalledWithTargetSerial );





exports.api_v1_serialpath_grant = function( queryFromGet, dataFromPost ){
	var createPromiseForSqlConnection = factoryImpl.sql_parts.getInstance( "createPromiseForSqlConnection" );
	var outJsonData = {};
	var inputData = {
		"serialKey" : dataFromPost.serial ? dataFromPost.serial : ""
	};

	return createPromiseForSqlConnection( 
		outJsonData, 
		inputData, 
		factoryImpl.CONFIG_SQL.getInstance()
	).then(function( inputData ){
		var config = factoryImpl.CONFIG_SQL.getInstance();
		var simple_sql = factoryImpl.simple_sql.getInstance();
		var sql_connection = simple_sql.open();
		var serialKey = inputData.serialKey;
		var grantedPath = "";

		return new Promise(function(resolve,reject){
			var grantPath = factoryImpl.grantPath.getInstance();
			grantPath(sql_connection, config.database, serialKey)
			.catch(function( err ){
				reject( err ); // 一気に抜ける。
			}).then(function(result){
				var updateCalled = factoryImpl.updateCalled.getInstance();
				var calledCount = result.called;
				var maxCount = result.max_entrys;

				if( calledCount < maxCount ){
					return updateCalled(
						sql_connection, 
						config.database, 
						serialKey, 
						result.path, 
						calledCount + 1, 
						maxCount 
					);
				}else{
					reject({
						"message" : "Not Granted",
						"http_status" : 403
					}); // 一気に抜ける。
				}
			}).then(function( result ){
				resolve({
					"path" : result.path,
					"left" : result.left
				})
			}).catch(function(){
				reject("update is ERROR");
			});
		});
	}).then(function(result){
		// ここまですべて正常終了
		var simple_sql = factoryImpl.simple_sql.getInstance();
		simple_sql.close();

		outJsonData["path"] = result.path;
		outJsonData["left"] = result.left;
		return Promise.resolve({
			"jsonData" : outJsonData,
			"status" : 200 // OK
		});
	}).catch(function(err){
		// どこかでエラーした⇒エラー応答のjson返す。
		var simple_sql = factoryImpl.simple_sql.getInstance();
		var http_status = (err && err.http_status) ? err.http_status : 500;

		simple_sql.close();
		outJsonData[ "error_on_add" ] = err;
		return Promise.resolve({
			"jsonData" : outJsonData,
			"status" : http_status
		}); // 異常系処理を終えたので、戻すのは「正常」。
    });
};






