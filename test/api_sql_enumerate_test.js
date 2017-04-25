/*
	[api_sql_enumerate_test.js]

	encoding=utf-8
*/

var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var sinon = require("sinon");
var shouldFulfilled = require("promise-test-helper").shouldFulfilled;
var shouldRejected  = require("promise-test-helper").shouldRejected;
require('date-utils');
var ApiCommon_StubAndHooker = require("./z_stubhooker.js").ApiCommon_StubAndHooker;


const api_enumerate = require("../src/api_sql_enumerate.js");

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


describe( "api_sql_enumerate.js", function(){
    var COMMON_STUB_MANAGER = new ApiCommon_StubAndHooker(function(){
        return {
            "CONFIG_SQL" : TEST_CONFIG_SQL, 
            "mssql" : { "close" : sinon.stub() },
            "sql_parts" : {
                "createPromiseForSqlConnection" : sinon.stub()
            }
        };
    });

    describe("::grantPathFromSerialNumber()", function(){
        var grantPathFromSerialNumber = api_enumerate.factoryImpl.sql_enumerate.getInstance("grantPath");
        it("正常系【仮作成】", function(){
            assert( grantPathFromSerialNumber );
        });
    });
    
    describe("::updateCalledWithTargetSerial()", function(){
        var updateCalledWithTargetSerial = api_enumerate.factoryImpl.sql_enumerate.getInstance("updateCalled");
        it("正常系【仮作成】", function(){
            assert( updateCalledWithTargetSerial );
        });
    });

    describe("::api_v1_serialpath_grant()", function(){
        var api_v1_serialpath_grant = api_enumerate.api_v1_serialpath_grant;
        it("正常系【仮作成】", function(){
            assert( api_v1_serialpath_grant );
        });
    });    
});






