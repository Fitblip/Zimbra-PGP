/*

This file is responsible for all the Zimbra integration functions and everything
else that's done in the zimbra interface

TODO:
     => Button that links to my Github
     => Possibly cache already verified messages and their info in sessionStorage()?
*/

/*
===== Declare a blank constructor, since we don't need one =====
*/
Com_Zimbra_PGP = function() {
};

/*
===== Build our prototype from our constructor and objectHandler =====
*/
Com_Zimbra_PGP.prototype = new ZmZimletBase;
Com_Zimbra_PGP.prototype.constructor = Com_Zimbra_PGP;

/*
===== Stupid convention, but may be used elsewhere =====
*/
Com_Zimbra_PGP.prototype.toString = 
function() {
    return "Com_Zimbra_PGP";
};

/*
===== Init functions (not needed really) =====
*/
Com_Zimbra_PGP.prototype.init = function() {
    //alert('Starting Zimlet');
};

/*
===== Matches our PGP stuff, and calls the info bar function =====
===== *NOTE*: Runs multiple times for each message =====
                ======================
                ===== ENTRY POINT ====
                ======================
*/
Com_Zimbra_PGP.prototype.match = function(line, startIndex) {
    var header = false;
    if (line.search(/-----BEGIN PGP SIGNED MESSAGE-----/) != -1) {
        header = true;
    }
    if (header) {
        this.infoBar();
    }
    return null;
};


/*
===== Draws our initial info bar with the proper signature algorithm =====
*/
Com_Zimbra_PGP.prototype.infoBar = function() {
	// Determine if we have HTML5 or not
    if (typeof(window['localStorage']) == "object") {
        window._HTML5 = true;
    } else {
        window._HTML5 = false;
    }
	// Find our infoDiv
	this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
	if (this.alreadyVerified(appCtxt.getCurrentView()._msgView._msg.id)) {
		var status;
		var msgHTML = this.getFromTempCache(appCtxt.getCurrentView()._msgView._msg.id);
		if (msgHTML.search('successfully') != -1) {
			status = "success";
		} else {
			status = "fail";
		}
		var HTML = '' +
			'<table id="infoBar" class="' + status + '" cellpadding="3" cellspacing="2">' +
				'<tbody>' +
					'<tr>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarLogo">' +
								'ZimbraPGP' +
							'</div>' +
						'</td>' +
						'<td style="text-align: center; width:80%;">' +
							'<div id="infoBarMsg">' +
								msgHTML +
							'</div>' +
						'</td>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarVerifyButton">' +
								'<a class="verifyButton" href="javascript:void(0)">Verify!</a>' +
							'</div>' +
						'</td>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarEscapeButton">' +
								'<a class="escapeButton" href="javascript:void(0)" onclick="Com_Zimbra_PGP.prototype.destroyInfoBar()">X</a>' +
							'</div>' +
						'</td>' +
					'</tr>' +
				'</tbody>' +
			'</table>';
		this._infoDiv.innerHTML = HTML;
	} else {	
		// Find the message that we're clicked on.
		var msgText = appCtxt.getCurrentView()._msgView._msg.getBodyPart();

		// Parse out our signature stuff and message text
		this._infoDiv.sigObj = new parseSig(msgText.content);
		this._infoDiv.txtObj = new parseText(msgText.content);

		// Inject HTML into the infobar section 
		var HTML = '' +
			'<table id="infoBar" class="unsure" cellpadding="3" cellspacing="2">' +
				'<tbody>' +
					'<tr>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarLogo">' +
								'ZimbraPGP' +
							'</div>' +
						'</td>' +
						'<td style="text-align: center; width:80%;">' +
							'<div id="infoBarMsg">' +
							 'This message is signed with a ' + this._infoDiv.sigObj.algorithm + ' key! Would you like to verify it\'s signature?' +
							'</div>' +
						'</td>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarVerifyButton">' +
								'<a class="verifyButton" href="javascript:void(0)" onclick="Com_Zimbra_PGP.prototype.searchForKey()">Verify!</a>' +
							'</div>' +
						'</td>' +
						'<td style="text-align: center;">' +
							'<div id="infoBarEscapeButton">' +
								'<a class="escapeButton" href="javascript:void(0)" onclick="Com_Zimbra_PGP.prototype.destroyInfoBar()">X</a>' +
							'</div>' +
						'</td>' +
					'</tr>' +
				'</tbody>' +
			'</table>';

		  // Make the bar visible
		this._infoDiv.innerHTML = HTML;
	}
};

/*
===== Destroys the info bar =====
*/
Com_Zimbra_PGP.prototype.destroyInfoBar = function() {
    // Find our infoDiv
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    this._infoDiv.innerHTML = "";
};


/*
===== Searches cache for key, if not found, ask about going online =====
*/
Com_Zimbra_PGP.prototype.searchForKey = function() {
    // Find our infoDiv
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    
    // If this key is found in the cache
    if (this.isInCache(this._infoDiv.sigObj.keyid)) {
        keytext = this.getFromCache(this._infoDiv.sigObj.keyid);
        // Some error checking for good measure
        if (!keytext) {
            this.errDialog('Cache lookup failed! Corrupted keys? Falling back to caching from the internet.');
            this.removeFromCache(this._infoDiv.sigObj.keyid);
            this.askSearch(); 
        }
        this.msgVerify(keytext);
    // Otherwise, ask about going online
    } else {   
        this.askSearch(); 
    }
};

/*
===== Perm. Cache storage functions - Fallback to cookies if HTML5 is unavilible =====
                        AKA: ....mmmmm abstraction
*/
Com_Zimbra_PGP.prototype.isInCache = function(keyid) {
    // If we have the necessary localStorage object
    if(window._HTML5) {
        // If the keyid is found in the session cache
        if (localStorage.getItem(keyid)) {
            return true;
        } else {
            return false;
        }
    // Or if HTML5's localStorage isn't availble
    } else {
        // Search the cookies for our prefix plus the keyid we want
        var cookies = document.cookie.split(';');
        for (i=0;i<cookies.length;i++) { 
            if (cookies[i].indexOf('ZimbraPGP_' + keyid) != -1) { 
               return true;
            } 
        }
        return false;        
    }        
};
Com_Zimbra_PGP.prototype.allKeysInCache = function() {
    var keyObj = null;
    var keyLength = null;
    // If we have the necessary localStorage object
    if(window._HTML5) {
        // Loop over everything in the cache and
        pgpKeys = {};
        for (p=0;p<localStorage.length;p++) {
	        keyObj = new publicKey(unescape(localStorage.getItem(localStorage.key(p))));
            if (keyObj.type == "DSA") {
                keyLength = keyObj.dsaG.toString(16).length * 4;
            } else if (keyObj.type == "RSA") {
                keyLength = keyObj.rsaN.toString(16).length * 4;
            }
	        pgpKeys[keyObj.id] = keyObj.type + "_" + keyLength + "_" + keyObj.user;
        }
    // Or if HTML5's localStorage isn't availble
    } else {
        var cookies = document.cookie.split(';');        
        var pgpCookies = new Array();       
        for (i=0;i<cookies.length;i++) { 
            // Populate our pgpCookies array with the pointers to the cookies we want
            if (cookies[i].indexOf('ZimbraPGP_') != -1) {
                pgpCookies.push(i);
            }
        }
        pgpKeys = new Object();
        // For each pgpCookie
        for (i=0;i<pgpCookies.length;i++) {     
            if (cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[0] === "ZimbraPGP_" + keyid) {
                keyObj = new publicKey(unescape(unescape(cookies[1].replace(/^\s/,'').split('=')[1])));
                if (keyObj.type == "DSA") {
                    keyLength = keyObj.dsaG.toString(16).length * 4;
                } else if (keyObj.type == "RSA") {
                    keyLength = keyObj.rsaN.toString(16).length * 4;
                }
	            pgpKeys[keyObj.id] = keyObj.type + "_" + keyLength + "_" + keyObj.user;
            }
        }  
    }        
};
Com_Zimbra_PGP.prototype.storeInCache = function(keyid,key) {
    // If we have the necessary localStorage object
    if(window._HTML5) {
        localStorage.setItem(keyid,escape(key));
    } else {
    //Set our cookies to expire in a year
        var rightNow=new Date();
        rightNow.setDate(rightNow.getDate() + 366);
        escapedKey = escape(key);
        document.cookie = 'ZimbraPGP_' + keyid +'='+ escapedKey + '; expires=' + rightNow.toUTCString();
    }
};
Com_Zimbra_PGP.prototype.getFromCache = function(keyid) {
    // If we have the necessary localStorage object
    if(window._HTML5) {
        keytext = unescape(localStorage.getItem(keyid));
        return keytext;
    } else {
        var cookies = document.cookie.split(';');        
        var pgpCookies = new Array();       
        for (i=0;i<cookies.length;i++) { 
            // Populate our pgpCookies array with the pointers to the cookies we want
            if (cookies[i].indexOf('ZimbraPGP_') != -1) {
                pgpCookies.push(i);
            }
        }
        // For each PGP cookie
        for (i=0;i<pgpCookies.length;i++) {     
            if (cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[0] === "ZimbraPGP_" + keyid) {
                // Delicious cookies
                keytext = unescape(cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[1]);
                return keytext;
            }
        }
        return null;
    }    
};
Com_Zimbra_PGP.prototype.removeFromCache = function(keyid) {
    // If we have the necessary localStorage object
    if(window._HTML5) {
        // If our keyid == all, remove all keys in the cache.
        if (keyid === 'all') {
            localStorage.clear();
        } else {
            localStorage.removeItem(keyid);
        }
    } else {
        var cookies = document.cookie.split(';');        
        var pgpCookies = new Array();       
        for (i=0;i<cookies.length;i++) { 
            // Populate our pgpCookies array with the pointers to the cookies we want
            if (cookies[i].indexOf('ZimbraPGP_') != -1) {
                pgpCookies.push(i);
            }
        }
        // If our keyid == all, remove all keys in the cache.
        if (keyid === 'all') {
            for (i=0;i<pgpCookies.length;i++) {     
                var zimKeyid = cookies[pgpCookies[i]].split('=')[0];
                document.cookie = zimKeyid + '=ThisDoesntMatterAnymore; expires=Thu Jan 01 1970 00:00:01 GMT-0500 (EST)';
            }
        }
        // For each PGP cookie
        for (i=0;i<pgpCookies.length;i++) {     
            if (cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[0] === "ZimbraPGP_" + keyid) {
                // Expire that thang!
                document.cookie = "ZimbraPGP_" + keyid + '=ThisDoesntMatterAnymore; expires=Thu Jan 01 1970 00:00:01 GMT-0500 (EST)';
            }
        }
    }    
};

/*
===== Temp. Cache storage functions - Fallback to cookies if HTML5 is unavilible =====
*/

Com_Zimbra_PGP.prototype.alreadyVerified = function(msgId) {
	if (window._HTML5) {
		if (sessionStorage.getItem(msgId)) {
            return true;
        } else {
            return false;
        }
	} else {
		var cookies = document.cookie.split(';');
        for (i=0;i<cookies.length;i++) { 
            if (cookies[i].indexOf('PGPVerified_' + msgId) != -1) { 
               return true;
            } 
        }
        return false; 
	}
};
Com_Zimbra_PGP.prototype.storeInTempCache = function(msgId,HTML) {
    // If we have the necessary sessionStorage object
    if(window._HTML5) {
        sessionStorage.setItem(msgId,escape(HTML));
    } else {
    // By default cookies are all session
        document.cookie = 'PGPVerified_' + msgId +'='+ escape(HTML)
    }
};
Com_Zimbra_PGP.prototype.getFromTempCache = function(msgId) {
    // If we have the necessary localStorage object
    if(window._HTML5) {
        msgHTML = unescape(sessionStorage.getItem(msgId));
        return msgHTML;
    } else {
        var cookies = document.cookie.split(';');        
        var pgpCookies = new Array();       
        for (i=0;i<cookies.length;i++) { 
            // Populate our pgpCookies array with the pointers to the cookies we want
            if (cookies[i].indexOf('PGPVerified_') != -1) {
                pgpCookies.push(i);
            }
        }
        // For each PGP cookie
        for (i=0;i<pgpCookies.length;i++) {     
            if (cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[0] === "PGPVerified_" + msgId) {
                // Delicious cookies
                msgHTML = unescape(cookies[pgpCookies[i]].replace(/^\s/,'').split('=')[1]);
                return msgHTML;
            }
        }
    	return null;
    }    
};

/*
===== Confirm it's alright to go online =====
*/
Com_Zimbra_PGP.prototype.askSearch = function() {
    // Get our new DWT widget window refrence
    this._dialog = appCtxt.getYesNoMsgDialog(); 
    // Message
    var errMsg = "Could not find public key in the cache, search pgp.mit.edu for it?";
    // Just a warning, not critical 
    // see http://wiki.zimbra.com/wiki/ZCS_6.0:Zimlet_Developers_Guide:Examples:Dialogs#Screenshots
    var style = DwtMessageDialog.INFO_STYLE;

    // set the button listeners up to the proper callbacks
    this._dialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this._searchBtnListener));
    this._dialog.setButtonListener(DwtDialog.NO_BUTTON, new AjxListener(this, this._clrBtnListener)); 

    // Reset state to a known state
    this._dialog.reset();
    // Pop in the message
    this._dialog.setMessage(errMsg,style);
    // and pop it up!
    this._dialog.popup();
};

/*
===== This searches the interwebs for a suitable public key =====
*/
Com_Zimbra_PGP.prototype._searchBtnListener = function(obj){
    // Find our infoDiv
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    // Clear our popup
    this._dialog.popdown();
    // Get our infoDiv location
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    // Create a new temporary div to populate with our response so we can navigate it easier, and hide it.
    var temp_div = document.createElement('div');
    // Talk to the JSP page to lookup the keyid parsed from the signature
    var response = AjxRpc.invoke(null, '/service/zimlet/com_zimbra_pgp/lookup.jsp?key=' + this._infoDiv.sigObj.keyid, null, null, true);
    // If we don't have a null response
    if (response.text !== "" && response.txt !== "No email specified") {
        // If the key was found, 
        temp_div.innerHTML = response.text;
        var keytext = temp_div.getElementsByTagName('pre')[0].innerHTML;
        this.storeInCache(this._infoDiv.sigObj.keyid,keytext);
        // Call msgVerify()
        this.msgVerify(keytext);
    } else {
        // If no key was found, error out and display the problem. 
        // Will update so manual key entry is possible later. 
        this.askManualEntry();
    }
};

/*
===== This asks about entering a key in manually, and stores it in the cache =====
*/
Com_Zimbra_PGP.prototype.askManualEntry = function(obj){
    // Get our new DWT widget window refrence
    this._dialog = appCtxt.getYesNoMsgDialog(); 
    // Message
    var errMsg = "Could not find the key on pgp.mit.edu, enter it manually?";
    // Just a warning, not critical 
    var style = DwtMessageDialog.INFO_STYLE;

    // set the button listeners up to the proper callbacks
    this._dialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this.manualKeyEntry));
    this._dialog.setButtonListener(DwtDialog.NO_BUTTON, new AjxListener(this, this._clrBtnListener)); 

    // Reset state to a known state
    this._dialog.reset();
    // Pop in the message
    this._dialog.setMessage(errMsg,style);
    // and pop it up!
    this._dialog.popup();
};

/*
===== This is the function responsible for verify the message itself and calling the proper bar =====
*/
Com_Zimbra_PGP.prototype.msgVerify = function(keytext){
    // Find our infoDiv
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    var msghash = '';
    var verified = false;
    var key = new publicKey(keytext);
    sig = this._infoDiv.sigObj;
    text = this._infoDiv.txtObj;

    // Hash our message out, and 
    if (text.hash == "SHA256") {
        msghash = SHA256(this._infoDiv.txtObj.msg + this._infoDiv.sigObj.header);
    } else if (text.hash == "SHA-1") {
        msghash = SHA1(this._infoDiv.txtObj.msg + this._infoDiv.sigObj.header);
    } else if (text.hash == "MD5") {
        msghash = MD5(this._infoDiv.txtObj.msg + this._infoDiv.sigObj.header);
    } else {
        this.errDialog("Unsupported hash type (" + text.hash + ")! As of right now we can only do SHA-1/SHA256/MD5.");
    }

    // If we have an RSA key
    if (key.type == "RSA") {
        verified = RSAVerify(sig.rsaZ,key.rsaE,key.rsaN,msghash);
    // Or if we have a DSA key
    } else if (key.type == "DSA") {
        verified = DSAVerify(key.dsaG,key.dsaP,key.dsaQ,key.dsaY,sig.dsaR,sig.dsaS,msghash);
    } else {
        // This should never happen
        this.errDialog("Unknown key type! Something is very wrong!");
    }

    // check if they signed with their subkey...
    if (!verified && key.type == "RSA") {
        verified = RSAVerify(sig.rsaZ,key.rsasubE,key.rsasubN,msghash);
    }

    // Successful verification! yay!
    if (verified) {
        this.successBar(key.id,key.user,key.type);
    } else {
        this.failBar(key.id,key.user,key.type);
    }
};

/*
===== This is the function responsible for the drawing of the manual key entry stuff =====
*/
Com_Zimbra_PGP.prototype.manualKeyEntry = function(){
    this._dialog.popdown();
    HTML = '<div id="keyEntryDiv">' +
	           '<textarea id="keyEntryTextarea"></textarea>' +
	       '</div>';

    var sDialogTitle = "<center>Enter in the public key and press \"OK\"</center>";

    this.pView = new DwtComposite(appCtxt.getShell());
    this.pView.setSize("500", "500"); 
    this.pView.getHtmlElement().style.overflow = "auto";
    this.pView.getHtmlElement().innerHTML = HTML;

    // pass the title, view & buttons information to create dialog box
    this._dialog = new ZmDialog({title:sDialogTitle, view:this.pView, parent:appCtxt.getShell(), standardButtons:[DwtDialog.OK_BUTTON]});
    this._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._readKeyListener)); 
    this._dialog.popup();
};

/*
===== These change the infoBar stuff to pass/fail verification =====
*/
Com_Zimbra_PGP.prototype.successBar = function(id,user,type){
    document.getElementById('infoBar').className = 'success';
    user = user.replace('<','&lt;').replace('>','&gt;');
    successMsg = "Message signed with <strong>" + type + "</strong> keyid : <strong>" + id + "</strong> and user : <strong>" + user + "</strong> verified successfully!";
    document.getElementById('infoBarMsg').innerHTML = successMsg;
	msgId = appCtxt.getCurrentView()._msgView._msg.id
	this.storeInTempCache(msgId,successMsg)
};

Com_Zimbra_PGP.prototype.failBar = function(id,user,type){
    document.getElementById('infoBar').className = 'fail';
    user = user.replace('<','&lt;').replace('>','&gt;');
    failMsg = "Message signed with <strong>" + type + "</strong> keyid : <strong>" + id + "</strong> and user : <strong>" + user + " *NOT*</strong> verified!";
    document.getElementById('infoBarMsg').innerHTML = failMsg;
	msgId = appCtxt.getCurrentView()._msgView._msg.id
	this.storeInTempCache(msgId,failMsg)
};

/*
===== Generic error handler, pass it a message and it displays all scary and everything =====
*/
Com_Zimbra_PGP.prototype.errDialog = function(msg){
        // Get refrence to our DWT object
        this._errDialog = appCtxt.getMsgDialog(); 
        // Set the style to critical
        var style = DwtMessageDialog.CRITICAL_STYLE;
        // Set the listener callback to just pop down the message
        this._errDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._clrErrBtnListener));
        // Reset to a good state
        this._errDialog.reset();
        // Set our message to the one passed in and pop it up!
        this._errDialog.setMessage(msg,style);
        this._errDialog.popup();
};

/*
===== These are the button listeners =====
*/
Com_Zimbra_PGP.prototype._clrErrBtnListener = function(){
    // Pops down the _dialog refrence
    this._errDialog.popdown();
};

Com_Zimbra_PGP.prototype._clrBtnListener = function(){
    // Pops down the _dialog refrence
    this._dialog.popdown();
};

Com_Zimbra_PGP.prototype._readKeyListener = function(){
    this._infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    this._dialog.popdown();
    // Get our key pasted in, and clear our the entry in the DOM
    var pgpKey = document.getElementById('keyEntryTextarea').value;
    document.getElementById('keyEntryTextarea').value = "";
    var tmp_key = new publicKey(pgpKey);
    if (tmp_key.err) {
        this.errDialog("Invalid key supplied.");
    } else if (tmp_key.id.toUpperCase() == this._infoDiv.sigObj.keyid.toUpperCase()) {
        // Store in cache
        this.storeInCache(tmp_key.id.toLowerCase(),pgpKey);
        // Pop up success message
        this._dialog = appCtxt.getMsgDialog(); 
        var msgText = "Keyid " + tmp_key.id.toLowerCase() + " added successfully!";
        var style = DwtMessageDialog.INFO_STYLE;
        this._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._clrBtnListener)); 
        this._dialog.reset();
        this._dialog.setMessage(msgText,style);
        this._dialog.popup();
        this.msgVerify(pgpKey);
    } else {
        this.errDialog("Key ID's do not match! <br>Inline : " + this._infoDiv.sigObj.keyid + "<br>Provided : " + tmp_key.id.toLowerCase());
    }
};
