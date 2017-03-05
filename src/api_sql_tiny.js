/*
    [api_sql_tiny.js]
    
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
 * 情報表示API：　バージョン表示など
 */
exports.api_v1_show = function( response, queryFromGet, dataFromPost ){
console.log( queryFromGet );
	var name = queryFromGet[ "name" ];
	if( name == "version" ){
		response.writeJsonAsString( { "version" : "1.00" } );
	} else {
		response.writeJsonAsString( { result : "show api is here." } );
	}
};



/**
 * @type SQL Server接続用の設定変数。
 */
var CONFIG_SQL = {
	user : process.env.SQL_USER,
	password : process.env.SQL_PASSWORD,
	server : process.env.SQL_SERVER, // You can use 'localhost\\instance' to connect to named instance
	database : process.env.SQL_DATABASE,
	stream : false,  // if true, query.promise() is NOT work! // You can enable streaming globally

	// Use this if you're on Windows Azure
	options : {
		database : process.env.SQL_DATABASE, // コレ要る？
		encrypt : true 
	} // It works well on LOCAL SQL Server if this option is set.
};
factoryImpl[ "CONFIG_SQL" ] = new lib.Factory( CONFIG_SQL );
// 即時関数でCONFIG_SQLを隠蔽してもいいんだけど、、、面倒なのでパス。




/**
 * SQL Server への接続テストAPI
 */
exports.api_v1_sql = function( response, queryFromGet, dataFromPost ){
	var mssql = factoryImpl.mssql.getInstance();
	var config = factoryImpl.CONFIG_SQL.getInstance();
	var connect = mssql.connect( config );

	connect.then(function(){
		response.writeJsonAsString({
			"result" : "sql connection is OK!"
		});
	}).catch(function(err){
		response.writeJsonAsString( err );
	}).then(function(){
		mssql.close();
	});
};






/**
 * バッテリーログをSQLへ記録するAPI
 */
exports.api_v1_batterylog_add = function( response, queryFromGet, dataFromPost ){
	var createPromiseForSqlConnection = factoryImpl.sql_parts.getInstance( "createPromiseForSqlConnection" );
	var getInsertObjectFromPostData = factoryImpl.sql_parts.getInstance( "getInsertObjectFromPostData");
	var outJsonData = {};
	var promise = createPromiseForSqlConnection( 
					outJsonData, 
					getInsertObjectFromPostData( dataFromPost ), 
					factoryImpl.CONFIG_SQL.getInstance()
	);

	return promise.then(function( inputData ){
		var config = factoryImpl.CONFIG_SQL.getInstance();
		return new Promise(function(resolve,reject){
			var isOwnerValid = factoryImpl.sql_parts.getInstance( "isOwnerValid" );
			var owner_hash = inputData.owner_hash;
			var is_onwer_valid_promise = isOwnerValid( config.database, owner_hash );
			is_onwer_valid_promise.then(function(){
				resolve( { "inputData" : inputData, "maxCount" : maxCount } ); // ⇒次のthen()が呼ばれる。
			}).catch(function(err){
				if( err ){
					outJsonData[ "errer_on_validation" ] = err;
					outJsonData[ "errerMessage" ] = "devicePermission of " + owner_hash + " is false."; 
				}
				reject(); // ⇒次のcatch()が呼ばれる。
			});
		});
		// 【自己メモ】http://azu.github.io/promises-book/#not-throw-use-reject
		// > §4.3.2. thenでもrejectする
		// > このとき、returnしたものがpromiseオブジェクトである場合、そのpromiseオブジェクトの状態によって、
		// > 次の then に登録されたonFulfilledとonRejectedのうち、どちらが呼ばれるかを決めることができます。
	}).then(function( result ){
		// 接続元の接続レート（頻度）の許可／不許可を検証
		var inputData = result.inputData;
		var maxCount  = result.maxCount;

		// 【FixME】レートの妥当性など判断。
		// promise = isDeviceAccessRateValied( databaseName, deviceKey, maxNumberOfEntrys, rateLimitePerHour )
		return Promise.resolve( inputData );
	}).then(function( inputData ){
		return new Promise(function(resolve,reject){
			var mssql = factoryImpl.mssql.getInstance();
			var sql_request = new mssql.Request(); // 【ToDo】：var transaction = new sql.Transaction(/* [connection] */);管理すべき？
			var owner_hash = inputData.owner_hash;
			var now_date = new Date();
			var date_str = now_date.toFormat("YYYY-MM-DD HH24:MI:SS.000"); // data-utilsモジュールでの拡張を利用。
			var battery_str = inputData.battery_value;
			var query_str = "INSERT INTO dbo.batterylogs(created_at, battery, owners_hash ) VALUES('" + date_str + "', " + battery_str + ", '" + owner_hash + "')";
			var sql_query = sql_request.query( query_str );
			sql_query.then(function(){ // INSERTコマンドのQuery成功時の引数は無し？
				outJsonData[ "result" ] = "Success to insert " + battery_str + " as batterylog on Database!";
				outJsonData[ "device_key"] = inputData.owner_hash;
				resolve();
			}).catch(function(err){
				outJsonData[ "error_on_insert" ];
				reject();
			});
		});
	}).then(function(){
		// 直前の「インサート」処理が成功
	}).catch(function(){
		// 直前の「インサート」処理は失敗。
	}).then(function(){
		// always 処理
		var mssql = factoryImpl.mssql.getInstance();
		mssql.close();
		response.writeJsonAsString( outJsonData );
	});
}





/**
 * バッテリーログをSQLから、指定されたデバイス（のハッシュ値）のものを取得する。
 */
exports.api_v1_batterylog_show = function( response, queryFromGet, dataFromPost ){
	// 接続要求のデータフォーマットを検証＆SQL接続を生成
	var createPromiseForSqlConnection = factoryImpl.sql_parts.getInstance( "createPromiseForSqlConnection" );
	var getShowObjectFromGetData = factoryImpl.sql_parts.getInstance( "getShowObjectFromGetData" );
	var outJsonData = {};
	// ※データフォーマット違反の場合、Promise.reject()するのだが、そうすると
	//  フォーマットOKでSQL接続のPromiseの生成とを、if文でここに記述する必要がある。
	//  この分岐は共通的なので、createPromise～()に押し込める設計、とした。
	var promise = createPromiseForSqlConnection( 
		outJsonData, 
		getShowObjectFromGetData( queryFromGet ), 
		factoryImpl.CONFIG_SQL.getInstance()
	);

	return promise.then(function( inputData ){
		// 接続元の認証Y/Nを検証。
		return new Promise(function(resolve,reject){
			var config = factoryImpl.CONFIG_SQL.getInstance();
			var isOwnerValid = factoryImpl.sql_parts.getInstance( "isOwnerValid" );
			var owner_hash = inputData.owner_hash;
			var is_onwer_valid_promise = isOwnerValid( config.database, owner_hash );
			is_onwer_valid_promise.then(function( maxCount ){
				resolve( { "inputData" : inputData, "maxCount" : maxCount } ); // ⇒次のthen()が呼ばれる。
			}).catch(function(err){
				if( err ){
					outJsonData[ "errer_on_validation" ] = err;
				}
				reject(); // ⇒次のcatch()が呼ばれる。
			});
		});
	}).then(function( result ){
		// 接続元の接続レート（頻度）の許可／不許可を検証
		var inputData = result.inputData;
		var maxCount  = result.maxCount;

		// 【FixME】レートの妥当性など判断。
		// promise = isDeviceAccessRateValied()
		return Promise.resolve( inputData );
	}).then(function( inputData ){
		// 対象のログデータをSQLへ要求
		var config = factoryImpl.CONFIG_SQL.getInstance();
		var getListOfBatteryLogWhereDeviceKey = factoryImpl.sql_parts.getInstance( "getListOfBatteryLogWhereDeviceKey" );
		return getListOfBatteryLogWhereDeviceKey(
			config.database, inputData.owner_hash, 
			{ 
				"start" : inputData.date_start, 
				"end"   : inputData.date_end
			}
		);
	}).then(function( recordset ){
		// 直前の「セレクト」処理が成功
		outJsonData["table"] = recordset;
	}).catch(function(){
		// 直前の「セレクト」処理は失敗。
		outJsonData[ "error_on_select" ];
	}).then(function(){
		// always 処理
		var mssql = factoryImpl.mssql.getInstance();
		mssql.close();
		response.writeJsonAsString( outJsonData );
	});
};




/**
 * バッテリーログをSQLから、指定されたデバイス（のハッシュ値）の、指定された期間を【削除】する。
 */
exports.api_v1_batterylog_delete = function( response, queryFromGet, dataFromPost ){
	var createPromiseForSqlConnection = factoryImpl.sql_parts.getInstance( "createPromiseForSqlConnection" );
	// var outJsonData = {};
	var outJsonData = { "Error" : "This resouse haven't been made." };
	var promise = Promise.resolve();
	
	return promise.then(function( inputData ){
		// 【FixME】正常系
	}).catch(function(){
		// 【FixME】異常系
	}).then(function(){
		// always 処理
		var mssql = factoryImpl.mssql.getInstance();
		mssql.close();
		response.writeJsonAsString( outJsonData );
	});
};




