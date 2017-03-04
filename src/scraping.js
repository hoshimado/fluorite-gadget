/*
	[scraping.js]

	encoding=utf-8
*/

var cheerioClient = require('cheerio-httpcli');

/**
 * cheerio-cliでの検索結果（リスト型を想定）を
 * 適当に要約して返却する。
 * clearly = function( cheerio-httpcli::$ ); が要約する関数。
 */
const searchClearly = function( url, request, clearly ){
	var promiseCheerio = cheerioClient.fetch( url, request );

	return new Promise(function (resolve, reject) {
		promiseCheerio.then( function( cheerioResult ){
			if( cheerioResult.error ){
				reject( cheerioResult.error );
			}else{
				// レスポンスヘッダを参照
				// console.log("レスポンスヘッダ");
				// console.log( cheerioResult.response.headers);
	
				// リンク一覧を生成
				var $ = cheerioResult.$;
				resolve({
					"clearlyList" : clearly( $ ),
					"cheerioJQuery" : $
				});
			}
		}).catch( function( err ){
			reject({ 
				"message" : "cheerio is ok, BUT clearly() is failed.",
				"error" : err 
			});
		});
	});
}

// 例：グーグル検索結果をリスト形式で取得する。
// request = 検索オブジェクト { q: "node.js" } の形式で指定。
//
/* ココでの定義は取りやめ。Debugのためにコードは残しておく。216/09/08
const searchClearlyByGoogle = function( request ){
	return searchClearly( "http://www.google.com/search", request, function( $ ){
		var results = [];

		$("div[class='g']").each( function (idx) {
			var target = $(this);
			var anchor = target.find("a").eq(0);
			var summary = target.find("span[ class='st'] ").eq(0);
	
			results.push({
				"name" : anchor.text(), 
				"href" : anchor.attr("href"), 
				"summary" : summary.text()
			});
		});
		return results;
	});
};
*/


exports.searchClearly = searchClearly;



