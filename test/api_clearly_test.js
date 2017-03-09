/*
	[api_clearly_test.js]

	encoding=utf-8
*/
var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var sinon = require("sinon");

const api_clearly = require("../src/api_clearly.js");
const responser_wrapper = require("../src/responser_wrapper.js");



describe( "api_clearly.js", function(){
	/**
	 * $.node() のスタブ。text(), attr()を疑似サポートする。
	 */
	function NodeStub( textReturned ){
		this.itsText = textReturned;
	};
	(function(){
		NodeStub.prototype.text = function(){ return this.itsText; }
		NodeStub.prototype.attr = function( name ){ return name; }
		NodeStub.prototype.html = function(){ return this.itsText; }
	}());

	beforeEach( function(){
		node = new NodeStub( "test" );
	});

	describe( "#getTextFromNode()", function(){
		it(" work for textNode." ,function(){
			const TEXT_RETURNED = "text node";
			var stub = sinon.stub( node, "text" );
			stub.withArgs().returns( TEXT_RETURNED );

			expect( 
				api_clearly.getTextFromNode( node, "text", null ), 
				"「text」が指定されたら、node.text() を呼ぶ" 
			).to.equal( TEXT_RETURNED );

			expect(
				api_clearly.getTextFromNode( node, "TeXt", "name"),
				"大文字小文字を気にせず、node.text() を呼ぶ。"
			).to.equal( TEXT_RETURNED );
		});

		it(" work for attribute node.", function(){
			const ATTR_RETURNED1 = "attr value1";
			const ATTR_RETURNED2 = "attr value2";
			var stub = sinon.stub( node, "attr" );
			stub.withArgs( "href" ).returns( ATTR_RETURNED1 );
			stub.withArgs( "class" ).returns( ATTR_RETURNED2 );

			expect(
				api_clearly.getTextFromNode( node, "attr", "href" ),
				"node.attr() での値を取得する"
			).to.equal( ATTR_RETURNED1 );
			expect(
				api_clearly.getTextFromNode( node, "ATTr", "class" ),
				"node.attr() での値を取得。引数は大文字小文字混在でOK。"
			).to.equal( ATTR_RETURNED2 );
		});

		it(" work for HTML node.", function(){
			const TEXT_RETURNED = "html node";
			var stub = sinon.stub( node, "html" );
			stub.withArgs().returns( TEXT_RETURNED );

			expect( 
				api_clearly.getTextFromNode( node, "html", null ), 
				"「text」が指定されたら、node.text() を呼ぶ" 
			).to.equal( TEXT_RETURNED );

			expect(
				api_clearly.getTextFromNode( node, "HtmL", "name"),
				"大文字小文字を気にせず、node.text() を呼ぶ。"
			).to.equal( TEXT_RETURNED );
		});

	})

	/**
	 * @description jQueryのスタブ。FAKE_JQ_CONTENTSで定義したツリーを返却するようにメソッドを組んである。
	 * 
	 * FAKE_JQ_CONTENTSは、以下のような「返すべきオブジェクト」を定義したツリー。
	 * { top_selector : [
	 * 	{ title   : [ node, node,, ],
	 * 	  href    : [ node, node,, ],
	 * 	  summary : [ node, node,, ] },
	 * 	{ title   : [ node, node,, ],
	 * 	  href    : [ node, node,, ],
	 * 	  summary : [ node, node,, ] },
	 * ]}
	 * 
	 * @param{object} contentsTree ツリー。FAKE_JQ_CONTENTSの仕様。
	 */
	function FAKE_JQ_FACTORY( contentsTree ){
		return function( selector ){
			var topPos = contentsTree[ selector ];
			return { 
				"eq" : function( index ){
					var arrayPos = topPos[index];
					if( index < topPos.length ){
						return { 
							"find" : function( selector ){
								var itemPos = arrayPos[ selector ];
								return { 
									"eq" : function(index){
										return itemPos[ index ];
									},
									"length" : itemPos.length
								};
							}
						};
					}else{
						return {};
					}
				},
				"length" : topPos.length
			};
		}
	};	

	describe("#clearlyFuncBySelectors() - 正常系", function(){
		/**
		 * jQueryのスタブで、元になるツリー。
		 * FAKE_JQ_FACTORY() の引数に渡して、疑似jQueryを生成する。
		 */
		const FAKE_JQ_CONTENTS = {
			"LIST_TOP" : [
				{ 
					"selector_title" : [ new NodeStub( "title1" ), new NodeStub( "title1-2" )],
					"selector_href"  : [ new NodeStub( "url1" ),   new NodeStub( "url1-2" )  ],
					"selector_sum"   : [ new NodeStub("summary1"),  new NodeStub( "summaery1-2" ) ] 
				},
				{ 
					"selector_title" : [ new NodeStub( "title2-1" )   , new NodeStub( "title2-2" )],
					"selector_href"  : [ new NodeStub( "url2-1" )     , new NodeStub( "url2-2" )],
					"selector_sum"   : [ new NodeStub( "summary2-1" ) , new NodeStub( "summary2-2" )]
				}
			]
		}
		var fakeJq = FAKE_JQ_FACTORY( FAKE_JQ_CONTENTS );

		it(" works for all selector with [0] index.", function(){
			var results = api_clearly.clearlyFuncBySelectors(
				fakeJq, {
					"top_selector" : "LIST_TOP",
					"title" : { 
						"selector" : "selector_title",
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
					"href" : {
						"selector" : "selector_href",
						"count"    : 0,
						"nodetype" : "attr",
						"nodename" : "attribulte_href"
					},
					"summary" : {
						"selector" : "selector_sum",
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
				}
			);

			(function(){ //テスト結果の検証
				var n = FAKE_JQ_CONTENTS.LIST_TOP.length;
				while( 0<n--) {
					expect( results[n].title,   "タイトル" ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_title[0].text() );
					expect( results[n].href,    "リンク先" ).to.equal( "attribulte_href" );
					expect( results[n].summary, "要約"   ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_sum[0].text() );
				}
			}())
		});
		
		it(" works for all selector with [1] index.", function(){
			var results = api_clearly.clearlyFuncBySelectors(
				fakeJq, {
					"top_selector" : "LIST_TOP",
					"title" : { 
						"selector" : "selector_title",
						"count"    : 1,
						"nodetype" : "text",
						"nodename" : null
					},
					"href" : {
						"selector" : "selector_href",
						"count"    : 1,
						"nodetype" : "attr",
						"nodename" : "attribulte_href"
					},
					"summary" : {
						"selector" : "selector_sum",
						"count"    : 1,
						"nodetype" : "text",
						"nodename" : null
					},
				}
			);

			(function(){ //テスト結果の検証
				var n = FAKE_JQ_CONTENTS.LIST_TOP.length;
				while( 0<n--) {
					expect( results[n].title,   "タイトル" ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_title[1].text() );
					expect( results[n].href,    "リンク先" ).to.equal( "attribulte_href" );
					expect( results[n].summary, "要約"   ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_sum[1].text() );
				}
			}());
		});
		
		it(" works for all selector with [1] and [0] index.", function(){
			var results = api_clearly.clearlyFuncBySelectors(
				fakeJq, {
					"top_selector" : "LIST_TOP",
					"title" : { 
						"selector" : "selector_title",
						"count"    : 1,
						"nodetype" : "text",
						"nodename" : null
					},
					"href" : {
						"selector" : "selector_href",
						"count"    : 0, // Fakeの都合で上手くテストは不十分。
						"nodetype" : "attr",
						"nodename" : "attribulte_href"
					},
					"summary" : {
						"selector" : "selector_sum",
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
				}
			);
			(function(){ //テスト結果の検証
				var n = FAKE_JQ_CONTENTS.LIST_TOP.length;
				while( 0<n--) {
					expect( results[n].title,   "タイトル" ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_title[1].text() );
					expect( results[n].href,    "リンク先" ).to.equal( "attribulte_href" );
					expect( results[n].summary, "要約"   ).to.equal( FAKE_JQ_CONTENTS.LIST_TOP[n].selector_sum[0].text() );
				}
			}());
		});

	});

	describe("#clearlyFuncBySelectors() - 異常系", function(){
		const FAKE_JQ_CONTENTS = {
			"LIST_TOP" : [
				{ 
					"selector_title" : [ { /* .text()等がアクセス不可の状態 */ } ],
					"selector_href"  : [ new NodeStub( "url1" ) ],
					"selector_sum"   : [ new NodeStub("summary1"),  new NodeStub( "summaery1-2" ) ] 
				},
				{ 
					"selector_title" : [ new NodeStub( "title2-1" )   , new NodeStub( "title2-2" )],
					"selector_href"  : [ { /* .attr()等がアクセス不可の状態 */ } ],
					"selector_sum"   : [ new NodeStub( "summary2-1" ) ]
				}
			],
			"LIST_CANT_GET" : [] // 最初のセレクターで、nodeがヒットしない場合。
		};
		var fakeJq = FAKE_JQ_FACTORY( FAKE_JQ_CONTENTS );

		it(" don't have 'node.text()' (NOT function、でもエラーしないこと)", function(){
			var results = api_clearly.clearlyFuncBySelectors(
				fakeJq, {
					"top_selector" : "LIST_TOP",
					"title" : { 
						"selector" : "selector_title", // このセレクターの戻り値nodeは、.text()が取れないケース。
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
					"href" : {
						"selector" : "selector_href",
						"count"    : 0,
						"nodetype" : "attr",
						"nodename" : "attribulte_href"
					},
					"summary" : {
						"selector" : "selector_sum",
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
				}
			);

			// 要素とプロパティ自体は存在すること。
			assert( results.length > 0, "結果のリスト自体は存在" ); 
			assert( results[0].hasOwnProperty("title"), "プロパティそのものも存在" ); 

			// しかし、プロパティの中身の一部（取れなかったヤツ）は空であること。			
			expect( results[0].title,   "タイトルは空" ).to.equal( "" );
			expect( results[0].href,    "リンク先" ).to.equal( "attribulte_href" ); // スタブが、「引数そのまま返す」スタイル。
			expect( results[0].summary, "要約は取れた"   ).to.equal( "summary1" );
		});


		it(" can't get the node of 'top_selector' (NOT function、でもエラーしないこと)", function(){
			var results = api_clearly.clearlyFuncBySelectors(
				fakeJq, {
					"top_selector" : "LIST_CANT_GET", // 最初のセレクターがヒットしないケース
					// 従って、柿のフィルターは渡すが、そもそもその適用まで進まない。
					"title" : {
						"selector" : "selector_title", 
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
					"href" : {
						"selector" : "selector_href",
						"count"    : 0,
						"nodetype" : "attr",
						"nodename" : "attribulte_href"
					},
					"summary" : {
						"selector" : "selector_sum",
						"count"    : 0,
						"nodetype" : "text",
						"nodename" : null
					},
				}
			);
			// 要素とプロパティ自体は存在すること。
			assert( results      , "結果のリスト自体は存在" ); 
			assert( results.length == 0, "リストのサイズは０。" );
		});

	});

	describe( "#summarylistEx() - 正常系", function(){
		const EXPECTED_LIST = [
			{"title" : "タイトル", "href" : "リンク先", "summary" : "要約" },
			{"title" : "タイトル2", "href" : "リンク先2", "summary" : "要約2" }
		];		
		const DATA_FROM_POST = null;
		const QUERY_FROM_GET = {
			// "callback" : "jQuery111108561677369828993_1473499035952",
			"keyword"  : "検索キーワード",
			"url"      : "検索するurl",
			"top_selector" : "s_1st",
			"title_selector" : "s_title",
			"title_count"  : "0",
			"title_nodetype" : "text",
			"title_nodename" : ""
		};

		it(" with minimum paramete [title] (href & summary is NOT defined.)",function(){
			const fakeScraping = { "searchClearly" : function(url, scrapingQuery, clearlyFunc){ 
				return new Promise( (resolve, reject)=>{
					setTimeout( ()=>{ resolve({
						"clearlyList" : EXPECTED_LIST,
						"cheerioJQuery" : null // ダミーなので、適当にnullを置いている。
					})}, 100 );
				} );
			}};
			const spyScraping = sinon.spy( fakeScraping, "searchClearly" );
			const fakeClearly = sinon.stub(); 


			const promise = api_clearly.summarylistEx( 
				fakeScraping, fakeClearly, 
				QUERY_FROM_GET, DATA_FROM_POST 
			);
			return promise.then( function( result ){ // Promise() 利用の場合、done()は使わず、then()をreturnする。
				assert( spyScraping.calledOnce, "scraping関数が1度だけ呼ばれた" );

				expect( spyScraping.getCall(0).args[0], "scraping関数へURLが正しく渡された")
				.to.equal( QUERY_FROM_GET.url );

				expect( spyScraping.getCall(0).args[1], "scraping関数へqueryオブジェクトが正しく渡された")
				.to.deep.equal({ "q" : QUERY_FROM_GET.keyword });

				(function(){
					// scraping.searchClearly() の引数３に渡された関数を拾う。
					var callback_CreatedByTargetFunc_ForScraping = spyScraping.getCall(0).args[2]; 
					// 渡された関数が意図した機能を持つか？を、実際にｃａｌｌしてその挙動をみることで検証。
					callback_CreatedByTargetFunc_ForScraping( "jq" );
					// 上記のcallback()を呼ぶと、その引数１が fakeClearlyとして先行して渡してあった
					// 関数の引数１として渡される。
					expect( fakeClearly.getCall(0).args[0] ).to.equal( "jq" );
					// また、先行して別途渡されたQUERY_FROM_GETを元に成形したオブジェクトが、
					// その引数２に渡される、、、機能が、このcallback関数にあればよい。
					expect( fakeClearly.getCall(0).args[1] ).to.deep.equal({
						"url"　:QUERY_FROM_GET.url, 
						"top_selector" : QUERY_FROM_GET.top_selector,
						"title" : {
							"selector" : QUERY_FROM_GET.title_selector,
							"count"    : QUERY_FROM_GET.title_count,
							"nodetype" : QUERY_FROM_GET.title_nodetype,
							"nodename" : null
						},
						"href" : { selector: '', count: '', nodetype: null, nodename: null },
						"summary" : {selector: '', count: '', nodetype: null, nodename: null}
					});
				}());

				expect( result.jsonData, "resolveのjsonDataが、Clearyly()#clearlyList であること。" )
				.to.deep.equal( EXPECTED_LIST );
				expect( result.status ).to.equal( 200 );
			});
		});
	});

	describe( "#summarylistEx() - 異常系", function(){
		it(" failed to searchClearly - cheerio-httpcli [reject()された異常系]");
	});
});



