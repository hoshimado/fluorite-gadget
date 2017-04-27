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
var ApiCommon_StubAndHooker = require("./support_stubhooker.js").ApiCommon_StubAndHooker;


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
            "simple_sql" : {
                "open"  : sinon.stub(),
                "close" : sinon.stub()
            },
            "CONFIG_SQL" : TEST_CONFIG_SQL, 
            "sql_parts" : {
                "createPromiseForSqlConnection" : sinon.stub()
            }
        };
    });

    describe("::api_v1_serialpath_grant()", function(){
        var stubs;
        var api_v1_serialpath_grant = api_enumerate.api_v1_serialpath_grant;
        var orignal = {};
        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();
            COMMON_STUB_MANAGER.hookInstance( api_enumerate, stubs );

            // こっちは記録するだけ。
            orignal["grantPath"] = api_enumerate.factoryImpl.grantPath.getInstance();
        });
        afterEach(function(){
            COMMON_STUB_MANAGER.restoreOriginal( api_enumerate );

            // こっちは独自に戻す。
            api_enumerate.factoryImpl.grantPath.setStub( orignal.grantPath );
        });

        it("正常系", function(){
            var EXPECTED_PATH = "返すURL";
            var EXPECTED_CALLED_COUNT = 4;
            var EXPECTED_MAX_ENTRYS = 32;
            var EXPECTED_INPUT_DATA = {
                "serialkey" : "abc123456789noncase32number16MAX" // dataFromPostとは異なるkeyなので注意。
            };
            var stub_grantPath = sinon.stub();
            var stub_updateCalled = sinon.stub()
            var queryFromGet = {};
            var dataFromPost = {
               "serial" : "abc123456789noncase32number16MAX"
            };

            stubs.sql_parts.createPromiseForSqlConnection.onCall(0).returns(
                Promise.resolve( EXPECTED_INPUT_DATA )
            );
            stub_grantPath.onCall(0).returns(
                Promise.resolve({ // ※updateとワンセット動作すべきなので、シリアルキーは外側で保持する。
                    "path" : EXPECTED_PATH,
                    "called" : EXPECTED_CALLED_COUNT,
                    "max_entrys" : EXPECTED_MAX_ENTRYS
                })
            );
            stub_updateCalled.onCall(0).returns(
                Promise.resolve()
            );

            // テストする。
            return shouldFulfilled(
                api_v1_serialpath_grant( queryFromGet, dataFromPost )
            ).then(function(result){
                // MSSQLへ接続
                var createConnect = stubs.sql_parts.createPromiseForSqlConnection;
                assert(createConnect.calledOnce, "createPromiseForSqlConnection()が1度呼ばれること");
                expect(createConnect.getCall(0).args[0]).to.be.exist; // outJsonData
                expect(createConnect.getCall(0).args[1]).to.equal( EXPECTED_INPUT_DATA );
                expect(createConnect.getCall(0).args[2]).to.deep.equal( TEST_CONFIG_SQL );

                // 接続したやつで「パス」ほかを取得する（正常）。
                assert(stub_grantPath.calledOnce, "grantPath()が1度呼ばれること");
                assert(stub_grantPath.getCall(0).args[0]).to.equal(TEST_CONFIG_SQL.database);
                assert(stub_grantPath.getCall(0).args[1]).to.equal(EXPECTED_INPUT_DATA.serialkey)

                // 接続したやつで、対象データを更新する。
                assert(stub_updateCalled.calledOnce, "updateCalled()が1度呼ばれること");
                assert(stub_updateCalled.getCall(0).args[0]).to.equal(TEST_CONFIG_SQL.database);
                assert(stub_updateCalled.getCall(0).args[1]).to.equal(EXPECTED_INPUT_DATA.serialkey)

                expect(result).to.have.property("status");
                expect(result).to.have.property("jsonData");
                expect(result.jsonData).to.have.property("path");
                expect(result.jsonData).to.have.property("left"); //他、検証追加？
            });
        });
    });    

    describe("::grantPathFromSerialNumber()", function(){
        var stubs;
        var grantPathFromSerialNumber = api_enumerate.factoryImpl.grantPath.getInstance();

        /**
         * @type beforeEachで初期化される。
         */
        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();

            COMMON_STUB_MANAGER.hookInstance( api_enumerate, stubs );
        });
        afterEach(function(){
            COMMON_STUB_MANAGER.restoreOriginal( api_enumerate );
        });

        // ここからテスト。
        it("正常系", function(){
            var stub_request = {
                "query" : sinon.stub()
            };
            var IN_SERIALKEY = "abc123456789noncase32number16MAX";
            var EXPECTED_PATH = "http://fluorite.halfmoon.jp/word/tbf02_azure_sql/";
            var EXPECTED_CALLED_COUNT = 8;
            var EXPECTED_MAX_ENTRYS = 16;
            stubs.simple_sql.open.onCall(0).returns( stub_request );
            stub_request.query.onCall(0).returns(
                Promise.resolve([// 配列。
                    { 
                        "id": 1,
                        "serial": 'ABCdef123456789test32number16MAX',
                        "called" : EXPECTED_CALLED_COUNT,
                        "max_entrys": EXPECTED_MAX_ENTRYS,
                        "url": EXPECTED_PATH + "         " // 空白が付く。
                    }, 
                    { "id" : "不要な2つめの要素→無いとは思うが、入れて置く" }
                ])
            );

            return shouldFulfilled(
                grantPathFromSerialNumber(TEST_CONFIG_SQL.database, IN_SERIALKEY)
            ).then(function(result){
                var buf;
                var EXPECTED_QUERY_STR = "SELECT [id], [serial], [called], [max_entrys], [url]";
                EXPECTED_QUERY_STR += " FROM [" + TEST_CONFIG_SQL.database + "].dbo.[redirect_serial]";
                EXPECTED_QUERY_STR += " WHERE [serial]='" + IN_SERIALKEY + "'";

                // SQL接続は生成済みで、クエリーの生成からスタートする。
                assert(stubs.simple_sql.open.calledOnce, "simple_sql.open()が一度呼ばれること");

                // クエリーが、期待した文字列で呼ばれること。
                assert(stub_request.query.calledOnce, "mssql::request::query()が1度呼ばれること");
                buf = stub_request.query.getCall(0).args[0].replace(/ +/g,' ');
                expect( buf ).to.equal( EXPECTED_QUERY_STR );

                expect(result).to.have.property("path").and.equal(EXPECTED_PATH); // 後ろの空白は除去済みであること。
                expect(result).to.have.property("called").and.equal(EXPECTED_CALLED_COUNT);
                expect(result).to.have.property("max_entrys").and.equal(EXPECTED_MAX_ENTRYS);
            });
        });
    });
    
    describe("::updateCalledWithTargetSerial()", function(){
        var stubs;
        var updateCalledWithTargetSerial = api_enumerate.factoryImpl.updateCalled.getInstance();

        /**
         * @type beforeEachで初期化される。
         */
        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();

            COMMON_STUB_MANAGER.hookInstance( api_enumerate, stubs );
        });
        afterEach(function(){
            COMMON_STUB_MANAGER.restoreOriginal( api_enumerate );
        });

        // ここからテスト。

        it("正常系", function(){
            var stub_request = {
                "query" : sinon.stub()
            };
            var IN_SERIALKEY = "abc123456789noncase32number16MAX";
            var CURRENT_CALLED_COUNT = 8;

            // ↓たぶん不要なハズ。
            // stubs.simple_sql.open.onCall(0).returns( stub_request );

            stub_request.query.onCall(0).returns(
                Promise.resolve()
            );

            return shouldFulfilled(
                updateCalledWithTargetSerial(TEST_CONFIG_SQL.database, IN_SERIALKEY, CURRENT_CALLED_COUNT)
            ).then(function(result){
                var buf;
                // ここから続き。
                var EXPECTED_QUERY_STR = "UPDATE [" + TEST_CONFIG_SQL.database + "].[dbo].[redirect_serial]";
                EXPECTED_QUERY_STR += " SET called=1";
                EXPECTED_QUERY_STR += " WHERE [serial]='" + IN_SERIALKEY + "'";

                // クエリー生成済みなので、呼び出し文字列チェックからスタートする。
                assert(stub_request.query.calledOnce, "mssql::request::query()が1度呼ばれること");
                buf = stub_request.query.getCall(0).args[0].replace(/ +/g,' ');
                expect( buf ).to.equal( EXPECTED_QUERY_STR );

                expect(result).to.not.be.exist;
            });
        });
    });
});






