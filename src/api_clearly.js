/*
    [api_clearly.js]
    
	encoding=utf-8
*/


const scraping = require("./scraping.js");
const debug = require("./debugger.js");




// [nodeType] はnullを許容する。この場合、戻り値はnullとなる。
const getTextFromNode = function( node, nodeType, name ){
	var result = null;
	if( nodeType ){ // nullが渡される可能性もあるので、ガードして弾く。
		switch( nodeType.toLowerCase() ){ // 小文字に変換して比較する。
			case "text":
				result = (node.text) ? node.text() : "";
				break;
			case "attr":
				result = (node.attr) ? node.attr( name ) : "";
				break;
			case "html": 
				result = (node.html) ? node.html() : "";
				break;
			default:
				break;
		}
	}
	return result;
};
const _URL_AND_TOPSELECTOR = ["url", "top_selector", "keyword"]; // _getScrapingQuery()での排他制御に使うので定義。
const _FILTER_KEYS = ["title", "href", "summary"];
const _getFilterObjectFromGetQuery = function( query ){
	var filter = {};
	var n = _FILTER_KEYS.length;

	filter.url          = (query[ "url" ])          ? query[ "url" ] : "";
	filter.top_selector = (query[ "top_selector" ]) ? query[ "top_selector" ] : "";
	while( 0 < n-- ){
		filter[ _FILTER_KEYS[n] ] = {
			"selector" : (query[ _FILTER_KEYS[n] + "_selector" ]) ? query[ _FILTER_KEYS[n] + "_selector" ] : "",
			"count"    : (query[ _FILTER_KEYS[n] + "_count" ])    ? query[ _FILTER_KEYS[n] + "_count"    ] : "",
			"nodetype" : (query[ _FILTER_KEYS[n] + "_nodetype" ]) ? query[ _FILTER_KEYS[n] + "_nodetype" ] : null,
			"nodename" : (query[ _FILTER_KEYS[n] + "_nodename" ]) ? query[ _FILTER_KEYS[n] + "_nodename" ] : null
		};
	}
	// debug.console_output( filter );
	return filter;
};
const clearlyFuncBySelectors = function( cheerioJq, parseFilter ){
	var results = []; // 何も見つからなければ、lentth=0 の配列を返却する。
	var listItem = cheerioJq( parseFilter.top_selector );
	var i, length = listItem.length;
	var target, element, n;

	for( i=0; i<length; i++ ){ // 検索結果の上から順に格納したいので、while逆順でなく、for文で回す。
		target = listItem.eq( i );

		item = {};
		n = _FILTER_KEYS.length;
		while( 0<n-- ){ // 返却するリストの【１つ当たり】の構成要素をループで回す。
			if( parseFilter[ _FILTER_KEYS[n] ].selector == "" ) {
				// 処理しない、仕様に変更。スキップする。2016/09/10～
				// element[ _FILTER_KEYS[n] ] = target;
				continue;
			}else{
				// element[ _FILTER_KEYS[n] ] = target
				element = target.find( parseFilter[ _FILTER_KEYS[n] ].selector );

				if( element.length > 0){
					element = element.eq( parseFilter[ _FILTER_KEYS[n] ].count );

					// ここで、item[ key ]にはテキストを格納する。取得NGならば「空文字」にする。
					item[ _FILTER_KEYS[n] ] = getTextFromNode( 
						// element[ _FILTER_KEYS[n] ],
						element,
						parseFilter[ _FILTER_KEYS[n] ].nodetype, // ここの引数はnullでも良い（戻り値がnullになるだけ）。
						parseFilter[ _FILTER_KEYS[n] ].nodename
					);
				}else{
					item[ _FILTER_KEYS[n] ] = ""; // 検索がヒットしなかった場合は空白。
				}

			}
		};

		results.push( item );
	}
	return results;
};


/**
 * 「スクレイピング後のフィルタリング」以外で使うkey名は、
 * スクレイピングする際のkey名としてそのまま渡す。
 */
const _getScrapingQuery = ( queryGetMethod )=>{
	var query = {}, n, isFilterKeys;
	for( var key in queryGetMethod ){
		isFilterKeys = false;
		if( _URL_AND_TOPSELECTOR.indexOf( key ) > -1 ){ // ※配列に対するindexOf()は、ES5～でのサポート（IE9未満は不可）。
			// 対象外。
			isFilterKeys = true;
		}
		n = _FILTER_KEYS.length;
		while( 0<n--){
			if( key.indexOf( _FILTER_KEYS[n] ) > -1 ){ // こちらは、一部一致でも対象外とする。
				isFilterKeys = true;
				break;
			}
		}

		if( !isFilterKeys ){
			query[ key ] = queryGetMethod[ key ]; // そのままコピーする。
		}
	}
	// 互換性のために「keyword」があれば、「q」として読み替える。
	// ※2016/09/30までは、指定したkye名のみ許可してた。keywordが来たらqに読み替えてた。
	if( Object.prototype.hasOwnProperty.call(queryGetMethod, "keyword" ) ){
		// ↑Node.js側のバグ？最新版なら修正済み？ https://github.com/hapijs/hapi/issues/3280
		// ToDo: 最新版にして確認する。
		query[ "q" ] = queryGetMethod[ "keyword" ];
	}

	// debug.console_output( "[Converted GET]\n" + JSON.stringify(query) );
	return query;
};


/**
 * UT考慮で、scrapingするモジュール他は、ストラテジ・パターン適用する。
 */ 
const summarylistEx = function( 
	_scrapingModule, _clearlyFunc, 
	queryFromGet, dataFromPost )
{
	const filter  = _getFilterObjectFromGetQuery( queryFromGet );
	const scrapingQuery = _getScrapingQuery( queryFromGet );
	const promise = _scrapingModule.searchClearly( 
		filter.url, scrapingQuery, 
		function( $ ){
			return _clearlyFunc( $, filter );
		}
	);

	return new Promise(function(resolve,reject){
		promise.then( function( result ){
			var summary_list = result.clearlyList;

			debug.console_output( "[http] response is done." );
			resolve({
				"jsonData" : summary_list,
				"status" : 200 // OK Status-Code
			});
		}).catch( function( err ){
			resolve({
				"jsonData" : err,
				"status" : 500 // Internal Error 【FixMe】適切なコード設定
			});
			debug.console_output( "[http:ERROR]: \n" + JSON.stringify(err) );
		});

	});
};





exports.api_v1_summarylist = function( queryFromGet, dataFromPost ){
	return summarylistEx( 
		/* 上の段は、ストラテージパターン。UT容易性を目的に。 */
		scraping, clearlyFuncBySelectors, 
		/* 下の段の引数が本命 */
		queryFromGet, dataFromPost 
	);
}

// 以下は、UT目的にexportsする。
exports.getTextFromNode = getTextFromNode;
exports.summarylistEx = summarylistEx;
exports.clearlyFuncBySelectors = clearlyFuncBySelectors;


