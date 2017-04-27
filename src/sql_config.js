/*
    [sql_config.js]
	encoding=utf-8
*/



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
exports.CONFIG_SQL = CONFIG_SQL;


