/*
	[api_sql_tiny_lite_test.js]

	encoding=utf-8
*/

var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var sinon = require("sinon");
var shouldFulfilled = require("promise-test-helper").shouldFulfilled;
var shouldRejected  = require("promise-test-helper").shouldRejected;
require('date-utils');
var ApiCommon_StubAndHooker = require("./support_stubhooker.js").ApiCommon_StubAndHooker;

const api_sql = require("../src/api_sql_tiny.js");

var TEST_CONFIG_SQL = { // テスト用
	user : "fake_user",
	password : "fake_password",
	server : "fake_server_url", // You can use 'localhost\\instance' to connect to named instance
	database : "fake_db_name",
	stream : false,  // if true, query.promise() is NOT work! // You can enable streaming globally

	// Use this if you're on Windows Azure
	options : {
		encrypt : true 
	} // It works well on LOCAL SQL Server if this option is set.
};


describe( "api_sql_tiny.js::SQLiteトライアル", function(){
	var api_v1_sqlite = api_sql.api_v1_sqlite_read;
	
    describe("::api_v1_sqlite()", function(){
		it("とりあえずテスト", function(){
			this.timeout(5000);
			var queryFromGet = { "device_key" : "ほげふがぴよ" };
			var dataFromPost = null;
			return shouldFulfilled(
				api_v1_sqlite( queryFromGet, dataFromPost )
			).then(function( result ){
				console.log( result.jsonData );
			});
		});
	});
});

