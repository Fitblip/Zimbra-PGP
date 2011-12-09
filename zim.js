/*

This file is responsible for all the Zimbra integration functions and everything
else that's done in the zimbra interface

TODO:
     => Implement StorageObjects to prevent hitting the bejesus out of pgp.mit.edu
     => Integrate manual key entry
     => Investigate new way to get message content, and write in logic to choose
     => Button that links to my Github

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
*/
Com_Zimbra_PGP.prototype.match = function(line, startIndex) {
    var ret = null;
    var header = false;
    var sig = false;
    if (line.search(/-----BEGIN PGP SIGNED MESSAGE-----/) != -1) {
        header = true;
    }
    if (header && line.search(/-----BEGIN PGP SIGNATURE-----/)) {
        sig = true; 
    }
    if (header && sig) {
        this.infoBar();
    }
    return ret;
};

/*
===== Draws our initial info bar with the proper algorithm =====
*/
Com_Zimbra_PGP.prototype.infoBar = function() {
    // Find the message that we're clicked on. TODO: This is a legacy way (apparently...)
    var msgText = appCtxt.getCurrentView().getSelection()[0].getFirstHotMsg();
    // Find our infoDiv
    var infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);

    // Parse out our signature stuff and message text
    infoDiv.sigObj = new parseSig(msgText.getTextPart());
    infoDiv.txtObj = new parseText(msgText.getTextPart());

    // Inject HTML into the infobar section 
    var HTML = '<div id="infoBar" class="unsure" height="100px">' +
                 '<div id="infoBarLeft">' +
                   // TODO: button that links to my github
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

/*
===== Destroys the info bar =====
*/

Com_Zimbra_PGP.prototype.destroyInfoBar = function() {
    var infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    infoDiv.innerHTML = "";
};

/*
===== Searches cache for key, if not found, ask about going online =====
*/
Com_Zimbra_PGP.prototype.searchForKey = function() {
    // TODO: search the cache here 
    /*


    */
    this.askSearch();
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
    // Clear our popup
    this._dialog.popdown();
    // Get our infoDiv location
    var infoDiv = document.getElementById(appCtxt.getCurrentView()._msgView._infoBarId);
    // Create a new temporary div to populate with our response so we can navigate it easier, and hide it.
    var temp_div = document.createElement('div');
    // Talk to the JSP page to lookup the keyid parsed from the signature
    var response = AjxRpc.invoke(null, '/service/zimlet/com_zimbra_pgp/lookup.jsp?key=' + infoDiv.sigObj.keyid, null, null, true);

    if (response.text !== "" && response.txt !== "No email specified") {
        var msghash = '';
        var verified = false;

        // If the key was found, 
        temp_div.innerHTML = response.text;
        key = temp_div.getElementsByTagName('pre')[0].innerHTML;
        // Parse out our key infomation. 
        key = new publicKey(key);
        sig = infoDiv.sigObj;
        text = infoDiv.txtObj;

        // Hash our message out, and 
        if (text.hash == "SHA256") {
            msghash = SHA256(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else if (text.hash == "SHA-1") {
            msghash = SHA1(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else if (text.hash == "MD5") {
            msghash = MD5(infoDiv.txtObj.msg + infoDiv.sigObj.header);
        } else {
            this.errDialog("Unsupported hash type! As of right now we can only do SHA-1/SHA-256/MD5.");
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

    } else {
        // If no key was found, error out and display the problem. 
        // Will update so manual key entry is possible later. 
        this.errDialog("Can not find key on pgp.mit.edu! Cannot proceed!");
    }
};

/*
===== This is the function responsible for the drawing of the manual key entry stuff =====
*/

Com_Zimbra_PGP.prototype.manualKeyEntry = function(){
    HTML = '<div id="keyEntryDiv">' +
	           '<textarea id="keyEntryTextarea"></textarea>' +
	       '</div>'

    var sDialogTitle = "<center>Enter in the public key and press \"OK\"</center>";

    this.pView = new DwtComposite(appCtxt.getShell()); //creates an empty div as a child of main shell div
    this.pView.setSize("500", "500"); // set width and height
    this.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar
    this.pView.getHtmlElement().innerHTML = HTML;

    // pass the title, view & buttons information to create dialog box
    this._dialog = new ZmDialog({title:sDialogTitle, view:this.pView, parent:appCtxt.getShell(), standardButtons:[DwtDialog.OK_BUTTON]});
    this._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._readKeyListener)); 
    this._dialog.popup(); //show the dialog
};

/*
===== These change the infoBar stuff to pass/fail verification =====
*/

Com_Zimbra_PGP.prototype.successBar = function(id,user,type){
    document.getElementById('infoBar').className = 'success';
    user = user.replace('<','&lt;').replace('>','&gt;');
    successMsg = "Message signed with <strong>" + type + "</strong> keyid : <strong>" + id + "</strong> and user : <strong>" + user + "</strong> verified successfully!";
    document.getElementById('infoBarMiddle').innerHTML = successMsg;
};

Com_Zimbra_PGP.prototype.failBar = function(id,user,type){
    document.getElementById('infoBar').className = 'fail';
    user = user.replace('<','&lt;').replace('>','&gt;');
    failMsg = "Message signed with <strong>" + type + "</strong> keyid : <strong>" + id + "</strong> and user : <strong>" + user + " *NOT*</strong> verified!";
    document.getElementById('infoBarMiddle').innerHTML = failMsg;
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
        // Set our message to the one passed in
        this._errDialog.setMessage(msg,style);
        // Pop it up!
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
    // Get our key pasted in, and clear our the entry in the DOM
    key = document.getElementById('keyEntryTextarea').value;
    document.getElementById('keyEntryTextarea').value = "";
    this._dialog.popdown();
};
