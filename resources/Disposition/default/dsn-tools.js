var sim = (function(globals) {
    'use strict';
    var JS_BUNDLE = '/scripts/ajax/ajax-bundle.js';
    var GLOBALS;
    var TOKEN_STORAGE_KEY = 'sim-token';
    var APP = null;

    function init(g){
        GLOBALS = g;
        disp('init');
        return loadJS(GLOBALS.instanceRoot+JS_BUNDLE);
    }

    // Connect using tokens if available
    function connect(params){
        return () => new Promise(function(resolve, reject){
            var userCreds = params.hasOwnProperty('login') && params.hasOwnProperty('password') ? {login: params.login, password:params.password} : false;
            var token = params.hasOwnProperty('tryToken') &&  params.tryToken===true ? window.localStorage.getItem(TOKEN_STORAGE_KEY)||false : false;
            if(APP!==null){
                disp('Already connected'); 
                resolve();
            }
            else if(token===false && userCreds===false){
                disp('Impossible to connect without connection params'); 
                reject();
            }
            else{
                var connectId = token ? '[token "'+TOKEN_STORAGE_KEY+'"]' : '[user "'+userCreds.login+'"]';
                APP = new Simplicite.Ajax(
                    GLOBALS.instanceRoot,
                    GLOBALS.endpoint,
                    token ? undefined : userCreds.login,
                    token ? undefined : userCreds.password
                );

                disp('Start connection for '+connectId);
                APP.login(
                    (s) => {
                        disp('Successful connection for '+connectId+'. Saving token...');
                        window.localStorage.setItem(TOKEN_STORAGE_KEY, s.authtoken);
                        APP.getGrant(g => {
                            disp('Got grant data for '+connectId+', user '+g.login+', responsibilities: '+JSON.stringify(APP.grant.responsibilities));
                            resolve();
                        });
                    },
                    () => {
                        disp('Failed login for '+connectId);
                        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
                        APP = null;
                        //retry if case failed for expired token
                        if(token&&userCreds)
                            connect(params)().catch(reject).then(resolve);
                        else
                            reject();
                        token&&userCreds ? connect(smp, userCreds, cb) : cb(false); 
                    },
                    token,
                    GLOBALS.params
                );
            }
        });

    }

    function getApp(){
        return new Promise(function(resolve, reject){
            resolve(APP);
        });
    }

    function loadJS(url){
        return new Promise(function(resolve, reject){
            var script = document.createElement('script');
            script.onload = function(){
                resolve();
            };
            script.src = url;
            document.head.appendChild(script);
        });
    }

    function disp(content){ //false, true, 'debug', 'container-id'
        if(GLOBALS.log === false){
            return;
        }
        if(GLOBALS.log === true || GLOBALS.log === undefined){
            console.log(JSON.stringify(content, null, 4));
            return;
        }
        else if(GLOBALS.log === 'debug'){
            console.debug(JSON.stringify(content, null, 4));
        }
        else if(document.getElementById(GLOBALS.log) !== null){
            var p = document.createElement("p");
            p.textContent = content;
            document.getElementById(GLOBALS.log)
                .appendChild(p)
                .appendChild(document.createElement("hr"));
        }
    }

    return {
        init : init,
        connect : connect,
        getApp: getApp,
        disp: disp
    };
})();

var Utils = (function(){
	function forceDownload(name, mime, b64content){
		if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
			var blob = b64toBlob(decodeURIComponent(b64content), mime);
			return navigator.msSaveBlob(blob, name);
		}
		else {
			var link = document.createElement("a");
			document.body.appendChild(link);
	        link.setAttribute("type", "hidden");
			link.href = "data:"+mime+";base64,"+b64content;
			link.download = name;
			link.target = "blank";
			link.click();
		}
	}

	function base64dataFromBoDoc(boDoc){
		return 'data:'+boDoc.mime+';base64,'+boDoc.content;
	}

	function b64toBlob(b64Data, contentType) {
		// Used for download data on IE10+ (need to convert base64 to blob)
		contentType = contentType || '';
		var sliceSize = 512;
		//b64Data = b64Data.replace(/^[^,]+,/, '');
		//b64Data = b64Data.replace(/\s/g, '');
		var byteCharacters = window.atob(b64Data);
		var byteArrays = [];

		for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		    var slice = byteCharacters.slice(offset, offset + sliceSize);

		    var byteNumbers = new Array(slice.length);
		    for (var i = 0; i < slice.length; i++) {
		        byteNumbers[i] = slice.charCodeAt(i);
		    }

		    var byteArray = new Uint8Array(byteNumbers);

		    byteArrays.push(byteArray);
		}

		var blob = new Blob(byteArrays, {type: contentType});
		return blob;
	}

	return {
		forceDownload: forceDownload,
		base64dataFromBoDoc: base64dataFromBoDoc,
		b64toBlob: b64toBlob
	};
})();