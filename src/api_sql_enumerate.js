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

// UTデバッグ用のHookポイント。運用では外部公開しないメソッドはこっちにまとめる。
exports.factoryImpl = factoryImpl;


/**
 * @type SQL Server接続用の設定変数。
 * 詳細は⇒ https://www.npmjs.com/package/mssql
 */
var CONFIG_SQL = {
	user : process.env.SQL_USER,
	password : process.env.SQL_PASSWORD,
	server : process.env.SQL_SERVER, // You can use 'localhost\\instance' to connect to named instance
	database : process.env.SQL_DATABASE,
	stream : false,  // if true, query.promise() is NOT work! // You can enable streaming globally

	// Use this if you're on Windows Azure
	options : {
		encrypt : true 
	} // It works well on LOCAL SQL Server if this option is set.
};
factoryImpl[ "CONFIG_SQL" ] = new lib.Factory( CONFIG_SQL );
// 即時関数でCONFIG_SQLを隠蔽してもいいんだけど、、、面倒なのでパス。


var grantPathFromSerialNumber = function( serialNumber ){

};
var updateCalledWithTargetSerial = function( serialNumber ){
	
}

factoryImpl[ "sql_enumerate" ] = new lib.Factory({
	"grantPath" : grantPathFromSerialNumber,
	"updateCalled" : updateCalledWithTargetSerial
});


exports.api_v1_serialpath_grant = function( queryFromGet, dataFromPost ){
/*    
	var createPromiseForSqlConnection = factoryImpl.sql_parts.getInstance( "createPromiseForSqlConnection" );
	var getInsertObjectFromPostData = factoryImpl.sql_parts.getInstance( "getInsertObjectFromPostData");
	var outJsonData = {};
	var inputData = getInsertObjectFromPostData( dataFromPost );

    // inputDataの検証


	return createPromiseForSqlConnection( 
		outJsonData, 
		inputData, 
		factoryImpl.CONFIG_SQL.getInstance()
	).then(function( inputData ){
		var param = new API_PARAM( resultAccessRate );
		var config = factoryImpl.CONFIG_SQL.getInstance();
		var addBatteryLog2Database = factoryImpl.sql_parts.getInstance("addBatteryLog2Database");

		return new Promise(function(resolve,reject){
			addBatteryLog2Database( 
				config.database, 
				param.getDeviceKey(), 
				param.getBatteryValue() 
			).then(function(resultInsert){
				// 「インサート」処理が成功
				// 【FixME】総登録数（対象のデバイスについて）を取得してjsonに含めて返す。取れなければ null でOK（その場合も成功扱い）。
				var param = new API_PARAM(resultInsert);
				outJsonData[ "result" ] = "Success to insert " + param.getBatteryValue() + " as batterylog on Database!";
				outJsonData[ "device_key"] = param.getDeviceKey();
				resolve();
			}).catch(function(err){
				// 「インサート」処理で失敗。
				outJsonData[ "error_on_insert" ];
				reject( err ); // ⇒次のcatch()が呼ばれる。
			});
		});
	}).then(function(){
		// ここまですべて正常終了
		var mssql = factoryImpl.mssql.getInstance();
		mssql.close(); // 【ToDo】create～（）に合わせてWrappwerすべきかな。⇒Test側のstubも合わせて修正。

		return Promise.resolve({
			"jsonData" : outJsonData,
			"status" : 200 // OK
		});
	}).catch(function(err){
		// どこかでエラーした⇒エラー応答のjson返す。
		var mssql = factoryImpl.mssql.getInstance();
		var http_status = (err && err.http_status) ? err.http_status : 500;

		mssql.close();
		outJsonData[ "error_on_add" ];
		return Promise.resolve({
			"jsonData" : outJsonData,
			"status" : http_status
		}); // 異常系処理を終えたので、戻すのは「正常」。
    });
*/
};






