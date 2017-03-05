/*
	[sql_parts_test.js]
    ※「TEST_CONFIG_SQL」がテスト時に不要なものを個々に記述。
    　必要なものは、api_sql_tiny_test.jsに記述。

	encoding=utf-8
*/



var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var sinon = require("sinon");
var shouldFulfilled = require("promise-test-helper").shouldFulfilled;
var shouldRejected  = require("promise-test-helper").shouldRejected;

const sql_parts = require("../src/sql_parts.js");


var TEST_DATABASE_NAME = "fake_database_name";
// TEST_CONFIG_SQL は不要。

describe( "sql_parts.js", function(){
    /**
     * @type 各テストからはアクセス（ReadOnly）しない定数扱いの共通変数。
     */
    var ORIGINAL = {};
    before( function(){
        ORIGINAL[ "mssql" ] = sql_parts.factoryImpl.mssql.getInstance();

        // mssal はフックしない。バックアップして戻すだけ。
    });
    after( function(){
        sql_parts.factoryImpl.mssql.setStub( ORIGINAL.mssql );
    });

    /**
     * @type mssql用のstubを生成して、そのインスタンスをフックする。
     */
    var createAndHookStubs4Mssql = function( targetInstance ){
        var stubs = {
            "Request_query" : sinon.stub(),
            "connect" : sinon.stub()
        };
        targetInstance.factoryImpl.mssql.setStub(
            { 
                "Request" : function(){ // 「newされる」ので、returnしておけば差替えれる。
                    return {"query" : stubs.Request_query };
                }, 
                "connect" : stubs.connect
            }
        );

        return stubs;
    };

    describe( "::createPromiseForSqlConnection()",function(){
        it("正常系",function(){
            var outJsonData = {};
            var inputDataObj = {};
            var sqlConfig = {};
            var stubs = createAndHookStubs4Mssql( sql_parts );

            stubs.connect.onCall(0).returns( Promise.resolve() );
            return shouldFulfilled(
                sql_parts.createPromiseForSqlConnection( outJsonData, inputDataObj, sqlConfig )
            ).then(function( result ){
                assert( stubs.connect.calledOnce );
                expect( stubs.connect.getCall(0).args[0] ).to.equal( sqlConfig );
                expect( outJsonData.result ).to.be.exist;
                expect( result ).to.equal( inputDataObj );
            });
        });
        it("異常系：その前の認証がエラー", function(){
            var outJsonData = {};
            var inputDataObj = { "invalid" : "something is wrong." };
            var sqlConfig = {};
            var stubs = createAndHookStubs4Mssql( sql_parts );
            
            return shouldRejected(
                sql_parts.createPromiseForSqlConnection( outJsonData, inputDataObj, sqlConfig )
            ).catch(function(){
                assert( stubs.connect.notCalled );
                expect( outJsonData.result ).to.not.be.exist;
            });
        });
        it("異常系：SQL接続がエラー", function(){
            var outJsonData = {};
            var inputDataObj = {};
            var sqlConfig = {};
            var EXPECTED_ERROR= {};
            var stubs = createAndHookStubs4Mssql( sql_parts );
            
            stubs.connect.onCall(0).returns( Promise.reject( EXPECTED_ERROR ) );
            return shouldRejected(
                sql_parts.createPromiseForSqlConnection( outJsonData, inputDataObj, sqlConfig )
            ).catch(function(){
                assert( stubs.connect.calledOnce );
                expect( stubs.connect.getCall(0).args[0] ).to.equal( sqlConfig );
                expect( outJsonData.result ).to.not.be.exist;
            });
        });
    });


    describe( "::getHashHexStr()", function(){
        var getHashHexStr = sql_parts.getHashHexStr;
        it(" get Md5Hash as Hex String", function(){
            var plain_text = "00-00-00-00-00-00-00-E0";
            var result = getHashHexStr( plain_text, "md5" );
            // http://kaworu.jpn.org/javascript/node.js%E3%81%A7%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E3%82%92%E8%A8%88%E7%AE%97%E3%81%99%E3%82%8B

            expect( result ).to.equal( "700994ca9c6c3470054d7b79783ecb1e",
            "md5の算出：その１" );

            plain_text = "00-56-00-72-00-00-00-E0";
            result = getHashHexStr( plain_text, "md5" );
            expect( result ).to.equal( "b99412a59efaab99995516205bae68e3",
            "md5の算出：その２" );
        });
    });


    describe( "::isOwnerValid()", function(){
        var isOwnerValid = sql_parts.isOwnerValid;
        it(" finds VALID hash.", function(){
            var stubs = createAndHookStubs4Mssql( sql_parts );
            var expected_recordset = [
                { "owners_hash" : "ほげ", 
                  "max_entrys"  : 127
                }
            ];
            var stub_query = stubs.Request_query;

            stub_query.onCall(0).returns( Promise.resolve( expected_recordset ) );

            return shouldFulfilled(
                isOwnerValid( TEST_DATABASE_NAME, expected_recordset[0].owners_hash )
            ).then( function( maxCount ){
                var query_str = stub_query.getCall(0).args[0];
                var expected_str = "SELECT owners_hash, max_entrys FROM [";
                expected_str += TEST_DATABASE_NAME + "].dbo.owners_permission WHERE [owners_hash]='";
                expected_str += expected_recordset[0].owners_hash + "'";

                assert( stub_query.calledOnce );
                expect( query_str ).to.be.equal( 
                    expected_str
                );
                expect( maxCount, "記録エントリーの最大個数を返却すること" ).to.be.exist;
            });
        });
        it(" dont finds VALID hash: WHERE command returns 0 array.", function(){
            var stubs = createAndHookStubs4Mssql( sql_parts );
            var stub_query = stubs.Request_query;
            var expected_recordset = [];

            stub_query.onCall(0).returns( Promise.resolve( expected_recordset ) );

            return shouldRejected(
                isOwnerValid( TEST_DATABASE_NAME, "fuga" )
            ).catch( function( err ){
                assert( err, "エラー引数が渡されること" );
            });
        });
    });



    describe( "::isDeviceAccessRatePerHourUnder()",function(){
        it("正常系");
        it("異常系");
    })
    // 直近一時間の記録取得して、その数を数えれば良かろう。

    describe( "::howManySecondsHavePassedFromLastAccess()",function(){
        it("正常系");
        it("異常系");
    })
    // デバイスキーに応じた最新の日付取る⇒ SELECT MAX(created_at) FROM [tinydb].[dbo].[batterylogs] WHERE [owners_hash]='キー'
    // 本来は、別テーブルでIP含めて管理すべきかも？
    // 引数は、IPアドレスを取得可能なものを渡すように。⇒ルーター側でheaderから取得しておく必要がある？？？



    describe( "::getInsertObjectFromPostData()", function(){
        var getInsertObjectFromPostData = sql_parts.getInsertObjectFromPostData;
        it("return valid-Object from POST data with MAC and battery.", function(){
            var postData = {
                "mac_address" : "00-56-00-72-00-00-00-E0",
                "battery_value" : 99
            };
            var result = getInsertObjectFromPostData( postData );
            expect( result.invalid ).to.not.be.exist;
            expect( result.owner_hash ).to.equal( "b99412a59efaab99995516205bae68e3",
            "MACアドレスとして与えた値をベースにmd5ハッシュが生成されていること" );
            expect( parseInt(result.battery_value) ).to.equal( 99 );
        });
        it("return valid-Object from POST data with device-key and battery", function(){
            var postData = {
                "battery_value" : "81",
                "device_key" : "ほげほげほげデバイス！"
            };
            var result = getInsertObjectFromPostData( postData );
            expect( result.invalid ).to.not.be.exist;
            expect( result.owner_hash ).to.equal( postData.device_key );
            expect( parseInt(result.battery_value) ).to.equal( 81 );
        });
        it("return invalid when battery_value is NOT Number.", function(){
            var postData = {
                "mac_address" : "00-56-00-72-00-00-00-E0",
                "battery_value" : "fuga"
            };
            var result = getInsertObjectFromPostData( postData );
            expect( result.invalid ).to.be.exist;
        });
    });



    describe("::getShowObjectFromGetData()", function(){
        var getShowObjectFromGetData = sql_parts.getShowObjectFromGetData;
        it("return valid-Object from GET data with device_key only.", function(){
            var dataGet = { "device_key" : "ほげふがぴよ" };
            var result = getShowObjectFromGetData( dataGet );
            var now_date = new Date();
            var past_date = new Date();
            past_date.setTime( now_date.getTime() - 7 * 86400000 ); //日数 * 1日のミリ秒数;;
            expect( result.invalid ).to.not.be.exist;
            expect( result.owner_hash ).to.equal( dataGet.device_key );
            expect( result.date_start )
            .to.equal(past_date.toFormat("YYYY-MM-DD"), "無指定なら、「7日前」として扱う。" );
            expect( result.date_end ).to.equal( now_date.toFormat("YYYY-MM-DD"), "無指定なら、「今日」として扱う。" );
        });
        it("return valid-Object from GET data with device_key, date_start.", function(){
            var dataGet = { 
                "device_key" : "ほげふがぴよ",
                "date_start" : "2017-02-17" 
            };
            var result = getShowObjectFromGetData( dataGet );
            var now_date = new Date();
            expect( result.invalid ).to.not.be.exist;
            expect( result.owner_hash ).to.equal( dataGet.device_key );
            expect( result.date_start ).to.equal( dataGet.date_start, "開始日の指定が在れば、それを採用" ); 
            assert( result.date_start.match(/[0-9]{4,4}\-[0-9][0-9]\-[0-9][0-9]/), "yyyy-mm-ddのフォーマットであること" );
            expect( result.date_end ).to.equal( now_date.toFormat("YYYY-MM-DD"), "無指定なら、「今日」として扱う。" );
        });
        it("return valid-Object from GET data with device_key, date_end.", function(){
            var dataGet = { 
                "device_key" : "ほげふがぴよ",
                "date_end" : "2017-02-17" 
            };
            var result = getShowObjectFromGetData( dataGet );
            var now_date = new Date();
            var past_date = new Date();
            past_date.setTime( now_date.getTime() - 7 * 86400000 ); //日数 * 1日のミリ秒数;;
            expect( result.invalid ).to.not.be.exist;
            expect( result.owner_hash ).to.equal( dataGet.device_key );
            expect( result.date_start )
            .to.equal(past_date.toFormat("YYYY-MM-DD"), "無指定なら、「7日前」として扱う。" );
            expect( result.date_end ).to.equal( dataGet.date_end, "終了日の指定が在れば、それを採用" ); 
            assert( result.date_end.match(/[0-9]{4,4}\-[0-9][0-9]\-[0-9][0-9]/), "yyyy-mm-ddのフォーマットであること" );
        });
        it("return invalid when {date_start, date_end}メンバのフォーマット「yyyy-mm-dd」に NOT 準拠。", function(){
            var dataGet = {
                "device_key" : "ほげふがぴよ",
                "date_start" : "2017-01"
            };
            var result = getShowObjectFromGetData( dataGet );
            expect( result.invalid ).to.be.exist;

            var dataGet = {
                "device_key" : "ほげふがぴよ",
                "date_end" : "2017-01"
            };
            result = getShowObjectFromGetData( dataGet );
            expect( result.invalid ).to.be.exist;
        });
        it("return invalid when GET data DONT have device_key regardless of other parameters.", function(){
            var dataGet = { "mac_address" : "00-56-00-72-00-00-00-E0" }; // mac_addressではなくdevice_keyが正しい。
            var result = getShowObjectFromGetData( dataGet );
            expect( result.invalid ).to.be.exist;

            dataGet = { 
                "date_start" : "2017-02-17" 
            };
            result = getShowObjectFromGetData( dataGet );
            expect( result.invalid ).to.be.exist;

            dataGet = { 
                "date_start" : "2017-02-01",
                "date_end"   : "2017-02-17" 
            };
            result = getShowObjectFromGetData( dataGet );
            expect( result.invalid ).to.be.exist;
        });
    });


    describe("::getListOfBatteryLogWhereDeviceKey()", function(){
        var getListOfBatteryLogWhereDeviceKey = sql_parts.getListOfBatteryLogWhereDeviceKey;
        it("指定された期間{start, end}でのQuery発行", function(){
            var stubs = createAndHookStubs4Mssql( sql_parts );
            var stub_query = stubs.Request_query;
            var EXPECTED_DEVICE_KEY = "ほげふがぴよ";
            var EXPECTED_PERIOD = {
                "start" : "2017-01-01",
                "end"   : "2017-01-31"
            };

            stub_query.onCall(0).returns(
                Promise.resolve()
            );
            
            return shouldFulfilled(
                getListOfBatteryLogWhereDeviceKey( 
                    TEST_DATABASE_NAME, 
                    EXPECTED_DEVICE_KEY,
                    EXPECTED_PERIOD
                )
            ).then(function(){
                var EXPECTED_QUERY_STR = "SELECT created_at, battery FROM [";
                EXPECTED_QUERY_STR += TEST_DATABASE_NAME;
                EXPECTED_QUERY_STR += "].dbo.batterylogs WHERE [owners_hash]='";
                EXPECTED_QUERY_STR += EXPECTED_DEVICE_KEY;
                EXPECTED_QUERY_STR += "' AND [created_at] >= '";
                EXPECTED_QUERY_STR += EXPECTED_PERIOD.start;
                EXPECTED_QUERY_STR += "' AND [created_at] < '";
                EXPECTED_QUERY_STR += EXPECTED_PERIOD.end;
                EXPECTED_QUERY_STR += "'";
                // SELECT created_at, battery FROM [tinydb].[dbo].[batterylogs] WHERE [owners_hash]='キー' AND [created_at] >= '2017-02-10' AND [created_at] < '2017-02-14';

                assert( stub_query.calledOnce, "query()が1度だけ呼ばれること" );
                expect( stub_query.getCall(0).args[0] ).to.equal(
                    EXPECTED_QUERY_STR
                )
            });
        });
        it("取得期間の引数は{start: null, end, null}を許容する→WHEREに入れない（将来拡張を見込み）", function(){
            var stubs = createAndHookStubs4Mssql( sql_parts );
            var stub_query = stubs.Request_query;
            var EXPECTED_DEVICE_KEY = "ほげふがぴよ";

            stub_query.onCall(0).returns(
                Promise.resolve()
            );
            
            return shouldFulfilled(
                getListOfBatteryLogWhereDeviceKey( 
                    TEST_DATABASE_NAME, 
                    EXPECTED_DEVICE_KEY,
                    null
                )
            ).then(function(){
                var EXPECTED_QUERY_STR = "SELECT created_at, battery FROM [";
                EXPECTED_QUERY_STR += TEST_DATABASE_NAME;
                EXPECTED_QUERY_STR += "].dbo.batterylogs WHERE [owners_hash]='";
                EXPECTED_QUERY_STR += EXPECTED_DEVICE_KEY;
                EXPECTED_QUERY_STR += "'";

                assert( stub_query.calledOnce, "query()が1度だけ呼ばれること" );
                expect( stub_query.getCall(0).args[0] ).to.equal(
                    EXPECTED_QUERY_STR
                )
            });
        });
    });
/*
    参照先Webページメモ　※最下段にも、同じものを記載。
    http://chaijs.com/api/bdd/
    http://sinonjs.org/docs/
    http://qiita.com/xingyanhuan/items/da9f814ce4bdf8f80fa1
    http://azu.github.io/promises-book/#basic-tests
*/
});
