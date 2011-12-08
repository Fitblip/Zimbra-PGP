/*

This file is responsible for all the Zimbra integration functions and everything
else that's done in the zimbra interface

*/

// Declare a constructor function we don't use
Com_Zimbra_PGP = function() {
};

// Start building up a prototype object for our zimlet
Com_Zimbra_PGP.prototype = new ZmZimletBase;
Com_Zimbra_PGP.prototype.constructor = Com_Zimbra_PGP;

// toString() method returns name of the Zimlet
Com_Zimbra_PGP.prototype.toString = 
function() {
    return "Com_Zimbra_PGP";
};

// Initilization function
Com_Zimbra_PGP.prototype.init = function() {
    alert('Starting Zimlet');
};

// Called when every email is clicked, if it finds the desired headers, ask about verification and 
// proceed from there. 
Com_Zimbra_PGP.prototype.match = function(line, startIndex) {
    var ret = null;
    var header = false;
    var sig = false;
    if (line.search(/-----BEGIN PGP SIGNED MESSAGE-----/) != -1) {
        var header = true;
    }
    if (header && line.search(/-----BEGIN PGP SIGNATURE-----/)) {
        var sig = true; 
    }
    if (header && sig) {
        alert('Building InfoBar')
        this.askInfoBar();
    }
    return ret;
};

// Write infobar to dom
Com_Zimbra_PGP.prototype.askInfoBar = function() {
    alert('finding email');
    // Find the message that we're clicked on. TODO: This is a legacy way (apparently...)
    var msg = appCtxt.getCurrentView().getSelection()[0].getFirstHotMsg();
    // Find our infoDiv
    alert('finding infoDiv');
    var infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId)
    alert('Parsing Stuffs');
    // Parse out our signature stuff and message text
    infoDiv.sigObj = new parseSig(msg.getTextPart());
    infoDiv.txtObj = new parseText(msg.getTextPart());

    // Inject HTML into the infobar section 
    // TODO: seperate into it's own CSS file.
    var HTML = '<style>' +
            '#infobar {' +
               'background-color: #efcc44;' +
               'border: 1px solid grey; position: relative;' +
               'overflow: hidden;' +
               'width: 100%;' +
            '}' +
            '#infoBarLeft{' +
               'padding: 8px 0px;' +
               'position:relative;' +
               'font-size: 15px;' +
               'color: black;' +
               'float: left;' +
               'width: 15%;' +
               'display: block;' +
               'text-align:center' +
            '}' +
            '#infoBarMiddle {' +
               'padding: 8px 0px;' +
               'font-size: 15px;' +
               'color: black;' +
               'float: left;' +
               'display: block;' +
               'width: 75%;' +
               'text-align:center;' +
            '}' +
            '#infoBarButton {' +
               'padding: 5px 0px;' +
               'font-size: 15px;' +
               'color: black;' +
               'float: right;' +
               'display: block;' +
               'width:9%;' +
               'text-align:center' +
            '}' +
            'a.myButton {' +
               'color: 666666;' +
            '}' +
            '.myButton {' +
               'background-color:#f9f9f9;' +
               '-moz-border-radius:7px;' +
               '-webkit-border-radius:7px;' +
               'border-radius:7px;' +
               'border:1px solid #dcdcdc;' +
               'display:inline-block;' +
               'color:#666666;' +
               'font-family:arial;' +
               'font-size:16px;' +
               'font-weight:bold;' +
               'padding:3px 8px;' +
               'text-decoration:none;' +
               'text-shadow:1px 1px 0px #ffffff;' +
               'text-decoration:none;' +
               '}.myButton:hover {' +
               'background-color:#e9e9e9;' +
               'text-decoration:none;' +
            '}' +
            '.myButton:active {' +
               'position:relative;' +
               'top:1px;' +
               'text-decoration:none;' +
            '}' +
         '</style>' +
         '<div id="infoBar" height="100px">' +
            '<div id="infoBarLeft">' +
               'ZimbraPGP' +
            '</div>' +
            '<div id="infoBarMiddle">' +
               'This message is signed with the ' + infoDiv.sigObj.algorithm + ' algorithm! Would you like to verify it\'s signature?' +
            '</div>' +
            '<div id="infoBarButton">' +
            '<a class="myButton" href="javascript:void(0)" onclick="Com_Zimbra_PGP.prototype.searchForKey()">Verify!</a>' +
            '</div>' +
         '</div>';
    // Make the bar visible
    infoDiv.innerHTML = HTML;
};

// Clear out our infobar
Com_Zimbra_PGP.prototype.destroyInfoBar = function() {
    var infoDiv = appCtxt.getCurrentView()._msgView._infoBarId;
    infoDiv.innerHTML = "";
};

// Searches cache for keys, if key isn't found, ask to search online. 
Com_Zimbra_PGP.prototype.searchForKey = function() {
    // TODO: search the cache here 
    /*


    */
    this.askSearch();
};

// Ask about going online to search for the public key
Com_Zimbra_PGP.prototype.askSearch = function() {
    // Get our new DWT widget window refrence
    this._dialog = appCtxt.getYesNoMsgDialog(); 
    // Message
    var msg = "Could not find public key in the cache, search pgp.mit.edu for it?";
    // Just a warning, not critical 
    // see http://wiki.zimbra.com/wiki/ZCS_6.0:Zimlet_Developers_Guide:Examples:Dialogs#Screenshots
    var style = DwtMessageDialog.INFO_STYLE;

    // set the button listeners up to the proper callbacks
    this._dialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this._searchBtnListener));
    this._dialog.setButtonListener(DwtDialog.NO_BUTTON, new AjxListener(this, this._clrBtnListener)); 

    // Reset state to a known state
    this._dialog.reset();
    // Pop in the message
    this._dialog.setMessage(msg,style);
    // and pop it up!
    this._dialog.popup();
};

// Searches the internet for the key and verifies the signature of the document.
Com_Zimbra_PGP.prototype._searchBtnListener = function(obj){
    alert('Search started.');
    // Clear our popup
    this._dialog.popdown();
    // Get our infoDiv location
    var infoDiv = appCtxt.getCurrentView()._msgView._infoBarId;
    // Create a new temporary div to populate with our response so we can navigate it easier, and hide it.
    var temp_div = document.createElement('div');
    // Talk to the JSP page to lookup the keyid parsed from the signature
    var response = AjxRpc.invoke(null, '/service/zimlet/com_zimbra_pgp/lookup.jsp?key=' + infoDiv.sigObj.keyid, null, null, true);
    alert('Search finished');
    if (response.text != "" && response.txt != "No email specified") {
        alert('Key Found.');
        // If the key was found, 
        temp_div.innerHTML = response.text;
        key = temp_div.getElementsByTagName('pre')[0].innerHTML;
        // Parse out our key infomation. 
        key = new publicKey(key);
        sig = infoDiv.sigObj;
        text = infoDiv.txtObj;

        alert('Start hashing.');
        // Hash our message out, and 
        if (text.hash == "SHA256") {
            var msghash = SHA256(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else if (text.hash == "SHA-1") {
            var msghash = SHA1(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else if (text.hash == "MD5") {
            var msghash = MD5(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else {
            this.errDialog("Unsupported hash type! As of right now we can only do SHA-1/SHA-256/MD5.");
        };
        alert('Finished hashing.');

        alert('Start verification.');
        // If we have an RSA key
        if (key.type == "RSA") {
            var verified = RSAVerify(sig.rsaZ,key.rsaE,key.rsaN,msghash);
        // Or if we have a DSA key
        } else if (key.type == "DSA") {
            var verified = DSAVerify(key.dsaG,key.dsaP,key.dsaQ,key.dsaY,sig.dsaR,sig.dsaS,msghash);
        } else {
            // This should never happen
            this.errDialog("Unknown key type! Something is very wrong! ")
        }

        // check if they signed with their subkey...
        if (!verified && key.type == "RSA") {
            verified = RSAVerify(sig.rsaZ,key.rsasubE,key.rsasubN,msghash);
        }
        alert('Finish verification.');

        // Successful verification! yay!
        if (verified) {
            alert('Verified.');
            this.successBar(key.id,key.user);
        } else {
            alert('Not Verified.');
            this.failBar(key.id,key.user);
        }

    } else {
        // If no key was found, error out and display the problem. 
        // Will update so manual key entry is possible later. 
        this.errDialog("Can not find key on pgp.mit.edu! Cannot proceed!")
    }
};

Com_Zimbra_PGP.prototype.successBar = function(id,user){
   alert('Called successBar().');
   alert('Success for keyid: ' + id + ' and user ' + user + '. Yay!')
};

Com_Zimbra_PGP.prototype.failBar = function(id,user){
   alert('Called failBar().');
   alert('Failed for keyid: ' + id + ' and user ' + user + '. Nooo!')
};

Com_Zimbra_PGP.prototype.errDialog = function(msg){
        alert('Called errDialog().');
        // Get refrence to our DWT object
        this._errDialog = appCtxt.appCtxt.getErrorDialog(); 
        // Set the style to critical
        var style = DwtMessageDialog.CRITICAL_STYLE;
        // Set the listener callback to just pop down the message
        this._errdialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._clrBtnListener));
        // Reset to a good state
        this._errdialog.reset();
        // Set our message to the one passed in
        this._errdialog.setMessage(msg,style);
        // Pop it up!
        this._errdialog.popup();
};

Com_Zimbra_PGP.prototype._clrErrBtnListener = function(obj){
    // Pops down the _dialog refrence
    this._errDialog.popdown();
};

Com_Zimbra_PGP.prototype._clrBtnListener = function(obj){
    // Pops down the _dialog refrence
    this._dialog.popdown();
};
