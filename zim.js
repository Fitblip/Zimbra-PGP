/*

This file is responsible for all the Zimbra integration functions and everything
else that's done in the zimbra interface

*/

Com_Zimbra_PGP = function() {

};

Com_Zimbra_PGP.prototype = new ZmZimletBase;
Com_Zimbra_PGP.prototype.constructor = Com_Zimbra_PGP;

// toString() method returns name of the Zimlet
Com_Zimbra_PGP.prototype.toString = 
function() {
    return "Com_Zimbra_PGP";
};

// Initilization function
Com_Zimbra_PGP.prototype.init = function() {
    alert(1);
};

// Write infobar to dom
Com_Zimbra_PGP.prototype.askInfoBar = function() {
    var msg = appCtxt.getCurrentView().getSelection()[0].getFirstHotMsg();
    var infoDiv = document.getElementById(document.getElementById('z_toast').nextSibling.id + '__MSG_infoBar');
    infoDiv.sigObj = new parseSig(msg.getTextPart());

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
               'This message is signed with the ' + infoDiv.sig.algorithm + ' algorithm! Would you like to verify it\'s signature?' +
            '</div>' +
            '<div id="infoBarButton">' +
            '<a class="myButton" href="javascript:void(0)" onclick="Com_Zimbra_PGP.prototype.verifySignature()">Verify!</a>' +
            '</div>' +
         '</div>';
    infoDiv.innerHTML = HTML;
};

Com_Zimbra_PGP.prototype.verifySignature = function() {
    this.askSearch();
};

// Ask about verifying the 
Com_Zimbra_PGP.prototype.askSearch = function() {
    this._dialog = appCtxt.getYesNoMsgDialog(); 
    var msg = "Could not find public key in the cache, search pgp.mit.edu for it?";
    var style = DwtMessageDialog.WARNING_STYLE;

    // set the button listeners
    this._dialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this._yesBtnListener));
    this._dialog.setButtonListener(DwtDialog.NO_BUTTON, new AjxListener(this, this._noBtnListener)); 

    this._dialog.reset();
    this._dialog.setMessage(msg,style);
    this._dialog.popup();
};

Com_Zimbra_PGP.prototype._yesBtnListener = function(obj){
    alert(sigObj.keyid)
    this._dialog.popdown();
};

Com_Zimbra_PGP.prototype._noBtnListener = function(obj){
    this._dialog.popdown();
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
        this.askInfoBar();
    }
    return ret;
};
