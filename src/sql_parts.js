/*
    [sql_parts.js]
    
	encoding=utf-8
*/

require('date-utils'); // Data() クラスのtoString()を拡張してくれる。
const debug = require("./debugger.js");
var lib = require("./factory4require.js");
var factoryImpl = { // require()を使う代わりに、new Factory() する。
    "mssql" : new lib.Factory4Require("mssql"),  // https://www.npmjs.com/package/mssql
	"crypto" : new lib.Factory4Require('crypto')
};

// UTデバッグ用のHookポイント。運用では外部公開しないメソッドはこっちにまとめる。
exports.factoryImpl = factoryImpl;




/**
 * GET/POSTデータのフォーマットが適切ならば、SQL接続のPromiseを返却する。
 * フォーマットが不正の時は、エラーメッセージを格納＆reject()を返却する。
 * 問題なければ、resolve( inputDataObj )を返却する。
 * 
 * @param{Object} outJsonData   httpで返却するJSONオブジェクト。生成済みで渡す。中で追加される。
 * @param{Boolean} inputDataObj 受け取ったデータ。POST/GETから変換済み。
 *                              invalidメンバが定義されていたら「接続前エラー」SQL接続せず、reject()する。
 * @param{Object} sqlConfig     SQL接続情報。inputDataObjが有効（invalidメンバ無し）なら、resolve(inputDataObj)する。
 */
var createPromiseForSqlConnection = function( outJsonData, inputDataObj, sqlConfig ){
	var promise;
	var invalid = inputDataObj.invalid;
	if( invalid && invalid.length > 0 ){
		// 前工程で、なんらかのエラーがあった。
		outJsonData[ "error_on_format" ] = "GET or POST format is INVAILD.";
		promise = Promise.reject(); // これで、then()を全てすっ飛ばして catch()へ逝くはず。
	}else{
		promise = new Promise(function(resolve,reject){
			var mssql = factoryImpl.mssql.getInstance();
			var connect = mssql.connect( sqlConfig );
			connect.then(function(){
				outJsonData["result"] = "sql connection is OK!";
				// outJsonData["information"] = "databese name is [" + CONFIG_SQL.database + "]";

				resolve( inputDataObj );
			}).catch(function( err ){
				outJsonData[ "errer_on_connection" ] = err;
				reject();
			});
		});
	}
	return promise;
}
exports.createPromiseForSqlConnection = createPromiseForSqlConnection;





/**
 * 渡されたMACアドレス（じゃなくても良いけど）から、ハッシュ値を求める。
 * 一応、ハッシュパターンは選択できるようにしておく。
 * 
 * @param{String} plainText 変換元になる文字列。
 * @param{String} ハッシュ値の計算方法。cryptoモジュール準拠。とりあえず「md5」設定しておけ。
 */
var getHashHexStr = function( plainText, algorithm ){
	var crypto = factoryImpl.crypto.getInstance();
	var hashsum = crypto.createHash(algorithm);
	hashsum.update(plainText);

	// cryptoモジュール（node.js標準）の詳細は以下のURL参照
	// http://qiita.com/_daisuke/items/990513e89ca169e9c4ad
	// http://kaworu.jpn.org/javascript/node.js%E3%81%A7%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E3%82%92%E8%A8%88%E7%AE%97%E3%81%99%E3%82%8B
	// http://nodejs.jp/nodejs.org_ja/docs/v0.4/api/crypto.html

	return hashsum.digest("hex");
};
exports.getHashHexStr = getHashHexStr;





/**
 * SQLへのアクセスが許可されたアクセス元か？
 * 
 * @param{String} databaseName データベース名
 * @param{String} ownerHash アクセスデバイスごとの一意の識別子。これが「認証用SQLデータベース」に入っていればアクセスOK。
 * @returns{Promise} 検証結果。Promise経由で非同期に返る。resolve()は引数無し。reject()はエラー内容が引数に入る。
 */
var isOwnerValid = function( databaseName, ownerHash ){
	return new Promise(function(resolve,reject){
		var mssql = factoryImpl.mssql.getInstance();
		var sql_request = new mssql.Request(); // 【ToDo】：var transaction = new sql.Transaction(/* [connection] */);管理すべき？
		var query_str = "SELECT owners_hash, max_entrys, called_count";
		query_str += " FROM [" + databaseName + "].dbo.owners_permission";
		query_str += " WHERE [owners_hash]='" + ownerHash + "'";

		sql_request.query( query_str ).then(function(recordset){
			var n = recordset.length;

			if( 0 < n ){
				resolve();
			}else{
				reject({
					"isDevicePermission" : false
				});
			}
		}).catch(function(err){
			reject({
				"isEnableValidationProcedure" : false
			});
		});	
	});
}
exports.isOwnerValid = isOwnerValid;



var isDeviceAccessRatePerHourUnder = function( rate_limit ){
	return true; // 【ToDo】未実装
};
exports.isDeviceAccessRatePerHourUnder = isDeviceAccessRatePerHourUnder;


var howManySecondsHavePassedFromLastAccess = function(){
	return 1; // 【ToDo】未実装。これは、ログデータベースとは別にアクセス管理（IPアドレス）すべきだが、、、
			  //         そこまで実装する暇あるか、今回？
			  //         new Date() 同志の引き算で、mili秒が変える筈。。。
};
exports.howManySecondsHavePassedFromLastAccess = howManySecondsHavePassedFromLastAccess;


/**
 * HTTP::POSTデータから、「ADD操作」に必要なデータ郡を取得。
 * API呼び出しのフォーマットのチェックを兼ねる。フォーマット不正なら { "invalid" : "理由" } を返却。
 * 入力データは、postData = { battery_value, mac_address | device_key } が期待値。
 * 
 * @returns オブジェクト{ owner_hash: "", battery_str: "" }。フォーマット違反なら{ "invalid" : "理由" }
 */
var getInsertObjectFromPostData = function( postData ){
	var valid_data = {}

	if( postData["battery_value"] && isFinite(postData[ "battery_value" ]) ){
		// 数字変換（int）出来る事、も必須。ただし、文字列のままで格納。
		valid_data[ "battery_value" ] = postData[ "battery_value" ];
	}else{
		valid_data[ "invalid" ] = "battery_value is NOT Number.";
	}

	if( postData["mac_address"] && postData["mac_address"].length > 0 ){
		// mac_addressは1文字以上必須とする。
		valid_data[ "owner_hash" ] = getHashHexStr( postData["mac_address"], "md5" );
	}else if( postData["device_key"] ){
		valid_data[ "owner_hash" ] = postData["device_key"];
	}else{
		valid_data[ "invalid" ] = "there is NOT mac_address nor device_key.";
	}

	return valid_data;
};
exports.getInsertObjectFromPostData = getInsertObjectFromPostData;






/**
 * HTTP::GETデータから、「SHOW操作」に必要なデータ郡を取得。
 * API呼び出しのフォーマットのチェックを兼ねる。フォーマット不正なら { "invalid" : "理由" } を返却。
 * 入力データは、getData = { device_key } が期待値。
 * 
 * @returns オブジェクト{ owner_hash: "" }。フォーマット違反なら{ "invalid" : "理由" }
 */
var getShowObjectFromGetData = function( getData ){
	var valid_data = {}
	var date_start = (function( pastDay ){
		var now_date = new Date();
		var base_sec = now_date.getTime() - pastDay * 86400000; //日数 * 1日のミリ秒数;
		now_date.setTime( base_sec );
		return now_date;
	}( 7 )); // 1週間前までを取得、を基本とする。
	var date_end = new Date(); // 現時点までを取得。

	if( getData[ "device_key" ] ){
		valid_data[ "owner_hash" ] = getData["device_key"];
		valid_data[ "date_start" ] = getData.date_start ? getData.date_start : date_start.toFormat("YYYY-MM-DD"); // data-utilsモジュールでの拡張を利用。
		valid_data[ "date_end"   ] = getData.date_end ? getData.date_end : date_end.toFormat("YYYY-MM-DD");

		if( !valid_data.date_start.match(/\d{4,4}-\d{2,2}-\d{2,2}/) ){
			valid_data[ "invalid" ] = "format of date is wrong.";
		}
		if( !valid_data.date_end.match(/\d{4,4}-\d{2,2}-\d{2,2}/) ){
			valid_data[ "invalid" ] = "format of date is wrong.";
		}
	}else{
		valid_data[ "invalid" ] = "parameter is INVAILD.";
	}

	return valid_data;
};
exports.getShowObjectFromGetData = getShowObjectFromGetData;


/**
 * デバイス識別キーに紐づいたバッテリーログを、指定されたデータベースから取得する。
 * @param{String} Database データベース名
 * @param{String} deviceKey デバイスの識別キー
 * @param{Object} period 取得する日付の期間 { start : null, end : null }を許容する。ただし、使う場合はyyyy-mm-dd整形済みを前提。
 * @returns{Promise} SQLからの取得結果を返すPromiseオブジェクト。成功時resolve( recordset ) 、失敗時reject( err )。
 */
var getListOfBatteryLogWhereDeviceKey = function( databaseName, deviceKey, period ){
	var mssql = factoryImpl.mssql.getInstance();
	var sql_request = new mssql.Request(); // 【ToDo】：var transaction = new sql.Transaction(/* [connection] */);管理すべき？

	var query_str = "SELECT created_at, battery FROM [" + databaseName + "].dbo.batterylogs";
	query_str += " WHERE [owners_hash]='" + deviceKey + "'"; // 固定長文字列でも、後ろの空白は無視してくれるようだ。
	if( period && period.start ){
		query_str += " AND [created_at] >= '";
		query_str += period.start;
		query_str += "'";
	}
	if( period && period.end ){
		query_str += " AND [created_at] < '";
		query_str += period.end;
		query_str += "'";
	}
	return sql_request.query( query_str );
};
exports.getListOfBatteryLogWhereDeviceKey = getListOfBatteryLogWhereDeviceKey;




