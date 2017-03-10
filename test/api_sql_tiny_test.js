/*
	[api_sql_tiny_test.js]

	encoding=utf-8
*/

var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var sinon = require("sinon");
var shouldFulfilled = require("promise-test-helper").shouldFulfilled;
var shouldRejected  = require("promise-test-helper").shouldRejected;
require('date-utils');

const api_sql = require("../src/api_sql_tiny.js");

var TEST_CONFIG_SQL = { // テスト用
	user : "fake_user",
	password : "fake_password",
	server : "fake_server_url", // You can use 'localhost\\instance' to connect to named instance
	database : "fake_db_name",
	stream : false,  // if true, query.promise() is NOT work! // You can enable streaming globally

	// Use this if you're on Windows Azure
	options : {
		// database : process.env.SQL_DATABASE, // コレ要る？
		encrypt : true 
	} // It works well on LOCAL SQL Server if this option is set.
};


describe( "api_sql_tiny.js", function(){

    /**
     * api_vi_batterylog_xxx() のテストで共通的な
     * Stub生成、フック、リストアを行う。
     * (※今回限りなので、prototypeじゃなくてコンストラクタでメソッド定義)
     */
    function ApiCommon_StubAndHooker(){
        this.original_prop= {};
        this.createStubs = function(){
            return {
                "CONFIG_SQL" : TEST_CONFIG_SQL, 
                "mssql" : { "close" : sinon.stub() },
                "sql_parts" : {
                    "createPromiseForSqlConnection" : sinon.stub(),
                    "isOwnerValid" : sinon.stub(),
                    "isDeviceAccessRateValied" : sinon.stub(),
                    "getInsertObjectFromPostData" : sinon.stub(),
                    "addBatteryLog2Database" : sinon.stub(),
                    "getShowObjectFromGetData" : sinon.stub(),
                    "getListOfBatteryLogWhereDeviceKey" : sinon.stub()
                }
            };
        };
        /**
         * メソッドをフックしてStubに差し替える。
         * ※オリジナルはバックアップしておく。
         *   「全ての関数をstub outする」の適切か否か不明。
         *   spy使うなら、オリジナルも必要。⇒なので毎回戻して、次回利用可能にしておく。
         */
        this.hookInstance = function( apiInstance, stubs ){
            var stub_keys = Object.keys( stubs );
            var n = stub_keys.length;

            // オリジナルをバックアップする。
            n = stub_keys.length;
            while( 0<n-- ){
                this.original_prop[ stub_keys[n] ] = apiInstance.factoryImpl[ stub_keys[n] ].getInstance();
            }

            // stubを用いてフックする。
            n = stub_keys.length;
            while( 0<n-- ){
                apiInstance.factoryImpl[ stub_keys[n] ].setStub( stubs[ stub_keys[n] ] );
            }
        };
        this.restoreOriginal = function( apiInstance ){
            var n = stub_keys.length;
            while( 0<n-- ){
                apiInstance.factoryImpl[ stub_keys[n] ].setStub( this.original_prop[ stub_keys[n] ] );
            }

        };
    };
    var COMMON_STUB_MANAGER = new ApiCommon_StubAndHooker();
    
    /**
     * @description writeJsonAsString() のスタブ生成
     */
    function StubResponse(){
        this.writeJsonAsString = sinon.stub();
    };

    var setupAbnormalFormatTest = function( stubs ){
        var EXPECTED_INPUT_DATA = { "owner_hash" : "があっても、", "invalid" : "が在ったら「不正データ」と判断されたを意味する。" };

        // 【ToDo】↓ここはspyで良いのかもしれないが、、、上手く実装できなかったのでstubで。stubで悪いわけではない。
        stubs.sql_parts.getShowObjectFromGetData.onCall(0).returns( EXPECTED_INPUT_DATA );

        // beforeEach()で準備される stub に対して、動作を定義する。
        stubs.sql_parts.createPromiseForSqlConnection.onCall(0).returns(
            Promise.reject()
        );

        return {
            "queryFromGet" : {
                "mac_address" : "はADDは許可。ShowやDeleteは禁止。いずれにせよ、なんらかのフォーマットエラーを想定"
            },
            "dataFromPost" : null,
            "EXPECTED_INPUT_DATA" : EXPECTED_INPUT_DATA
        };
    };
    var verifyAbnormalFormatTest = function( result, stubs, param ){
        var stubCreateConnection = stubs.sql_parts.createPromiseForSqlConnection;
        var stubList = stubs.sql_parts.getListOfBatteryLogWhereDeviceKey;

        assert( stubs.sql_parts.getShowObjectFromGetData.calledOnce, "呼び出しパラメータの妥当性検証＆整形、が一度呼ばれること" );
        expect( stubs.sql_parts.getShowObjectFromGetData.getCall(0).args[0] ).to.equal(param.queryFromGet);

        assert( stubCreateConnection.notCalled, "SQLへの接続生成、が呼ばれないこと" );

        assert( stubs.sql_parts.isOwnerValid.notCalled, "アクセス元の認証、が呼ばれないこと" );
        
        assert( stubs.sql_parts.isDeviceAccessRateValied.notCalled, "アクセス頻度の認証、が呼ばれないこと" );

        assert( stubList.notCalled, "SQLへのログ取得クエリー、が呼ばれないこと。" );

        assert( stubs.mssql.close.notCalled, "【FixME】mssql.closeが、notConnectionでの呼ばれてしまうなぁ" );
        expect( result ).to.be.exist;
        // expect( stubWrite.getCall(0).args[0].table ).to.deep.equal( EXPECTED_RECORDSET );
        // httpステータス400が設定されること。
    };

    describe("::api_v1_batterylog_show()", function(){
        /**
         * @type beforeEachで初期化される。
         */
        var stubs;
        var api_v1_batterylog_show = api_sql.api_v1_batterylog_show;

        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();
            stub_keys = Object.keys( stubs );

            COMMON_STUB_MANAGER.hookInstance( api_sql, stubs );
        });
        afterEach(function(){
            COMMON_STUB_MANAGER.restoreOriginal( api_sql );
        });  // 今は無し。

        // ここからテスト。
        it("正常系", function(){
            var queryFromGet = { "device_key" : "ほげふがぴよ" };
            var dataFromPost = null;
            var EXPECTED_INPUT_DATA = { 
                "owner_hash" : queryFromGet.device_key,
                "date_start" : "2017-02-01", // queryGetに無い場合でも、、デフォルトを生成する。
                "date_end"   : "2017-02-14"  // 上同。
            };
            var EXPECTED_RECORDSET = [
                {"created_at":"2017-02-08T00:47:25.000Z","battery":91},
                {"created_at":"2017-02-11T12:36:01.000Z","battery":77}
            ];
            var EXPECTED_MAX_COUNT = 255;

            // 【ToDo】↓ここはspyで良いのかもしれないが、、、上手く実装できなかったのでstubで。stubで悪いわけではない。
            stubs.sql_parts.getShowObjectFromGetData.onCall(0).returns( EXPECTED_INPUT_DATA );

            // beforeEach()で準備される stub に対して、動作を定義する。
            stubs.sql_parts.createPromiseForSqlConnection.onCall(0).returns(
                Promise.resolve( EXPECTED_INPUT_DATA )
            );
            stubs.sql_parts.isOwnerValid.onCall(0).returns(
                Promise.resolve( EXPECTED_MAX_COUNT )
            );
            stubs.sql_parts.isDeviceAccessRateValied.onCall(0).returns(
                Promise.resolve()
            );
            stubs.sql_parts.getListOfBatteryLogWhereDeviceKey.onCall(0).returns(
                Promise.resolve( EXPECTED_RECORDSET )
            );

            return shouldFulfilled(
                api_v1_batterylog_show( queryFromGet, dataFromPost )
            ).then(function( result ){
                var stubCreateConnection = stubs.sql_parts.createPromiseForSqlConnection;
                var stubList = stubs.sql_parts.getListOfBatteryLogWhereDeviceKey;

                assert( stubs.sql_parts.getShowObjectFromGetData.calledOnce, "呼び出しパラメータの妥当性検証＆整形、が一度呼ばれること" );
                expect( stubs.sql_parts.getShowObjectFromGetData.getCall(0).args[0] ).to.equal(queryFromGet);

                assert( stubCreateConnection.calledOnce, "SQLへの接続生成、が一度呼ばれること" );
                expect( stubCreateConnection.getCall(0).args[0] ).to.be.an('object');
                expect( stubCreateConnection.getCall(0).args[1] ).to.have.ownProperty('owner_hash');

                assert( stubs.sql_parts.isOwnerValid.calledOnce, "アクセス元の認証、が一度呼ばれること" );
                expect( stubs.sql_parts.isOwnerValid.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubs.sql_parts.isOwnerValid.getCall(0).args[1] ).to.equal( queryFromGet.device_key );
                
                assert( stubs.sql_parts.isDeviceAccessRateValied.calledOnce, "アクセス頻度の認証、が一度呼ばれること" );
                expect( stubs.sql_parts.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubs.sql_parts.getCall(0).args[1] ).to.equal( queryFromGet.device_key );
                expect( stubs.sql_parts.getCall(0).args[2] ).to.equal( EXPECTED_MAX_COUNT );
                // databaseName, deviceKey, maxNumberOfEntrys, rateLimitePerHour 
                // 引数に、、、「直前のアクセスからの経過時間」を入れるかは未定。

                assert( stubList.calledOnce, "SQLへのログ取得クエリー。getListOfBatteryLogWhereDeviceKey()が1度呼ばれること。" );
                expect( stubList.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubList.getCall(0).args[1] ).to.equal( queryFromGet.device_key );
                expect( stubList.getCall(0).args[2] ).to.deep.equal({
                    "start" : EXPECTED_INPUT_DATA.date_start,
                    "end"   : EXPECTED_INPUT_DATA.date_end 
                });

                assert( stubs.mssql.close.calledOnce );

                expect( result ).to.be.exist;
                expect( result.jsonData.table ).to.deep.equal( EXPECTED_RECORDSET );

                // 【FixMe】200をwriteJsonで返している検証が未記述。
            });
        });

        // ◆異常系は、まとめてテスト（関数定義して、それをit()に渡す）べきか？
        it("異常系：要求パラメータのフォーマットGなら、400を返す", function(){
            var param = setupAbnormalFormatTest( stubs );
            
            return shouldFulfilled(
                api_v1_batterylog_show( param.queryFromGet, param.dataFromPost )
            ).then(function( result ){
                verifyAbnormalFormatTest( result, stubs, param );
            });

        } );
        it("異常系：認証NGなら、401を返す");
        // メモ⇒レートリミットはShowとaddで変更する。
        it("異常系：レートリミット違反なら（アクセス時間間隔）、503を返す");
        it("異常系：その他のエラーなら503を返す");
    });

    // ↓内部関数のフックは、show（）と共通化すべきカナ？
    describe("::api_v1_batterylog_add()", function(){
        var api_v1_batterylog_add = api_sql.api_v1_batterylog_add;
        var stubs;

        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();
            stub_keys = Object.keys( stubs );

            COMMON_STUB_MANAGER.hookInstance( api_sql, stubs );
        });
        afterEach(function(){});  // 今は無し。

        it("正常系", function(){
            var queryFromGet = null;
            var dataFromPost = {
                "battery_value" : "パーセンテージ",
                "mac_address" : "識別用のMACアドレス"
            }; // mac_address の代わりに device_key でもよい。そこはgetInsertObjectFromPostData()の受け持ちなので、ここではテストしない。
            var EXPECTED_INPUT_DATA = { 
                "owner_hash" : "MACを元に、getInsert～が変換する識別子",
                "battery_value" : dataFromPost.battery_value
            };
            var EXPECTED_MAX_COUNT = 255;

            stubs.sql_parts.getInsertObjectFromPostData.onCall(0).returns( EXPECTED_INPUT_DATA );

            // beforeEach()で準備される stub に対して、動作を定義する。
            stubs.sql_parts.createPromiseForSqlConnection.onCall(0).returns(
                Promise.resolve( EXPECTED_INPUT_DATA )
            );
            stubs.sql_parts.isOwnerValid.onCall(0).returns(
                Promise.resolve( EXPECTED_MAX_COUNT )
            );
            stubs.sql_parts.isDeviceAccessRateValied.onCall(0).returns(
                Promise.resolve()
            );
            stubs.sql_parts.addBatteryLog2Database.onCall(0).returns(
                Promise.resolve({
                    "battery_value" : EXPECTED_INPUT_DATA.battery_value,
                    "owner_hash" : EXPECTED_INPUT_DATA.owner_hash
                })
            );

            return shouldFulfilled(
                api_v1_batterylog_add( queryFromGet, dataFromPost )
            ).then(function( result ){
                var stubGetInsertObject = stubs.sql_parts.getInsertObjectFromPostData;
                var stubCreateConnection = stubs.sql_parts.createPromiseForSqlConnection;
                var stubAdd = stubs.sql_parts.addBatteryLog2Database;

                assert( stubGetInsertObject.calledOnce, "呼び出しパラメータの妥当性検証＆整形、が一度呼ばれること" );
                expect( stubGetInsertObject.getCall(0).args[0] ).to.equal( dataFromPost );

                assert( stubCreateConnection.calledOnce, "SQLへの接続生成、が一度呼ばれること" );
                expect( stubCreateConnection.getCall(0).args[0] ).to.be.an('object');
                expect( stubCreateConnection.getCall(0).args[1] ).to.have.ownProperty('owner_hash');

                assert( stubs.sql_parts.isOwnerValid.calledOnce, "アクセス元の認証、が一度呼ばれること" );
                expect( stubs.sql_parts.isOwnerValid.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubs.sql_parts.isOwnerValid.getCall(0).args[1] ).to.equal( EXPECTED_INPUT_DATA.owner_hash );

                assert( stubs.sql_parts.isDeviceAccessRateValied.calledOnce, "アクセス頻度の認証、が一度呼ばれること" );
                expect( stubs.sql_parts.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubs.sql_parts.getCall(0).args[1] ).to.equal( queryFromGet.device_key );
                expect( stubs.sql_parts.getCall(0).args[2] ).to.equal( EXPECTED_MAX_COUNT );
                // databaseName, deviceKey, maxNumberOfEntrys, rateLimitePerHour 
                // 引数に、、、「直前のアクセスからの経過時間」を入れるかは未定。

                assert( stubAdd.calledOnce, "SQLへのログ追加クエリー。addBatteryLog2Database()が1度呼ばれること。" );
                expect( stubAdd.getCall(0).args[0] ).to.equal( TEST_CONFIG_SQL.database );
                expect( stubAdd.getCall(0).args[1] ).to.equal( EXPECTED_INPUT_DATA.owner_hash );
                expect( stubAdd.getCall(0).args[2] ).to.equal( EXPECTED_INPUT_DATA.battery_value );

                assert( stubs.mssql.close.calledOnce );

                expect( result ).to.be.exist;
                expect( result.status ).to.equal( 200 );
                expect( result.jsonData ).to.have.ownProperty( "result" );
            });

        });
        it("異常系：認証NGなら、401を返す");
        it("異常系：レートリミット違反なら（時間当たりの回数超過）、503を返す");
        it("異常系：その他のエラーなら503を返す");
    });


    describe("::api_v1_batterylog_delete()", function(){
        var api_v1_batterylog_delete = api_sql.api_v1_batterylog_delete;
        var stubs;

        beforeEach(function(){ // 内部関数をフックする。
            stubs = COMMON_STUB_MANAGER.createStubs();
            stub_keys = Object.keys( stubs );

            COMMON_STUB_MANAGER.hookInstance( api_sql, stubs );
        });
        afterEach(function(){});  // 今は無し。

        it("正常系");
        it("異常系：認証NGなら、401を返す");
        it("異常系：レートリミット違反なら（時間当たりの回数超過？）、503を返す");
        it("異常系：その他のエラーなら503を返す");
    });
});
/*
    参照先Webページメモ
    http://chaijs.com/api/bdd/
    http://sinonjs.org/docs/
    http://qiita.com/xingyanhuan/items/da9f814ce4bdf8f80fa1
    http://azu.github.io/promises-book/#basic-tests
*/






