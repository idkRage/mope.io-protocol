const WebSocket = require("ws");
//const ProxyAgent = require('proxy-agent');


//Buffer mod
Buffer.prototype.writeString = function(str, off) {
    str = unescStr(str);
    len = str.length;
    this.writeUInt16BE(str.length, off);
	off += 2;
	
    for (var i = 0; i < len; i++){
        this.writeUInt8(str.charCodeAt(i), off);
		off++;
	};
	
	return off;
};

Buffer.prototype.readString = function(off){
	let len = this.readUInt16BE(off);
	off += 2;
	
	let str = "";
	
	for(let i = 0; i < len; i++){
		str += String.fromCharCode(this.readUInt8(off));
		off++;
	};
	
	return {
		off,
		str,
	};
};


let unescStr = function(_0x160fe0) {
    return unescape(encodeURIComponent(_0x160fe0));
};


class bot {

    constructor(id, wsUrl, name, loginID, loginPass) {
        this.id = id;
        this.ip = wsUrl;
        this.ws = null;
        this.name = name;
		this.loginUserID = loginID;
		this.loginPasswordToken = loginPass;
		
		this.killTimer = null;
		this.coins = 0; //Earned coins
	
        this.connect();
    };
	
	log(){
		console.log(`[${this.name}]`, ...arguments);
	};

    connect() {
        let host = this.ip.substr(6, this.ip.length - 7);
        //this.log(host);
        this.ws = new WebSocket(this.ip, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'sl-SI,sl;q=0.9,en-GB;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Connection': 'Upgrade',
                    'Host': host,
                    'Origin': 'https://mope.io',
                    'Pragma': 'no-cache',
                    'Upgrade': 'websocket',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
                },
                //agent: new ProxyAgent(this.proxy),
            });

        this.ws.binaryType = "nodebuffer";

        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);
        this.ws.onmessage = this.onMsg.bind(this);
    };

    wsSend(msg) {
		
        if (this.ws && this.ws.readyState == 1) {
			//this.log(msg)
            this.ws.send(msg);
        } else {
            //this.log("Failed to send!");
        }
    };

    onOpen() {
        this.log("Open!");
		
        //Init
		let off = 0;
		let buf = Buffer.alloc(6 + 2 + this.loginUserID.length + 2 + this.loginPasswordToken.length);
        buf.writeUInt8(1, off);
		off++;
        buf.writeUInt32BE(0x3d3f7cd, off); //Version
		off += 4;
        buf.writeUInt8(1, off); //Logged in
		off++
		
		//Login tokens
        off = buf.writeString(this.loginUserID, off);
        off = buf.writeString(this.loginPasswordToken, off);

        this.wsSend(buf);
        this.sendNick(true);
		this.sendResolution();
    };

    onClose() {
        this.log("Closed!");
		
		//Reconnect
		clearInterval(this.killTimer);
		this.connect();
    };

    onError(err) {
        this.log("Error:", err);
    };
	
	onMsg(msg){
		msg = msg.data;
		let type = msg.readUInt8(0);

		switch(type){
			
			case 2:
			    var off = 1;
                var someFlag = 0x0 < msg.readUInt8(off);
				off++;
                var someStr = msg.readString(off);
				off = someStr.off;
                var someFlag2 = 0x0 < msg.readUInt8(off);
				off++;
                if (someFlag) {
                    if (someFlag2)
                        try {
                            var val = msg.readUInt16BE(off);
							off += 2;
                            var elID = msg.readString(off);
							off = elID.off;
							
                            //_0x1133e0(_0x22736a, 'if', _0x3f8159);
							this.replayAD(elID.str, 'if', val); //Check if iframe exists inside ad panel
                        } catch (err) {
							this.log(err);
						}
                    else {
					};
				};
		    break;
			
			case 6: //Spawned
			    this.log("Spawned!");
				
				//Kill after coins gained
				this.killTimer = setTimeout(function(){
					this.kill();
				}.bind(this), 95*1000);
			break;
			
			case 14: //Died
			
			    //Reset timeout
			    clearTimeout(this.killTimer);
				
			    var deathType = msg.readUInt8(1);
                var spawnExp = msg.readUInt32BE(2);
				
                var coinStr = msg.readString(6);
				var earnedCoins = parseInt(coinStr.str);
				this.coins += earnedCoins;
				
				this.log("Died!");
				this.log("Stats:");
				this.log("Death type:", deathType);
				this.log("Spawn xp:", spawnExp);
				this.log("Coins earned:", earnedCoins);
				this.log("\n");
				
				this.log("Total coins earned: ", this.coins);
			
			    this.log("Respawn!");
			    this.spawn();
			break;
		};
	};
	
	//1st time
	spawn(){
		this.sendNick(false);
		this.sendAnimal(0);
	};
	
	//Kill if alive, respawn
	respawn(){
		this.sendNick(true);
        this.spawn();
	};
	
	//Kill
	kill(){
		this.sendNick(true);
	};

    //Send name
    sendNick(firstTime) {
        let off = 0;
	    let buf = Buffer.alloc(0x9 + this.name.length + 0x2);
	    buf.writeUInt8(0x2, off);
		off++;
        buf.writeUInt8(firstTime ? 0x1 : 0x0, off);
		off++;
        off = buf.writeString(this.name, off);
        buf.writeUInt16BE(1920, off);
		off += 2;
        buf.writeUInt16BE(1080, off);
		off += 2;
        buf.writeUInt8(0x0, off); //Has ad-block
		off++;
		
		this.wsSend(buf);
    };
	
	sendResolution(){
		//Resolution
		let bf = Buffer.alloc(5);
		bf.writeUInt8(0x11, 0);
		bf.writeUInt16BE(1943, 1);
		bf.writeUInt16BE(990, 3);
		this.wsSend(bf);
	};
	
	//Send back ad info - adblock check
	replayAD(elID, str, str2){
		//var element = document["getElementById"](elID);
        /*element && */
		str += 'r';
		var element = 0;
		
        str2 = element + '' + str2,
        str2 = str2 + '' + element;
		//this.log(str2);
        let buf = Buffer.alloc(0x2 + str2["length"] + 0x2);
        buf["writeUInt8"](0x3e, 0);
        buf["writeString"](str2, 1);
		this.wsSend(buf);
		
		setTimeout(function(){
		    this.spawn();
		}.bind(this), 1*1000);
	};

    //Send animal choice
    sendAnimal(index) {
        var newMsg = Buffer.alloc(0x2);
        newMsg['writeUInt8'](0x18, 0);
        newMsg['writeUInt8'](index, 1);
        this.wsSend(newMsg);
    };

    //Move to world position
    moveTo(x, y) {
        var mes = Buffer.alloc(5);
        mes['writeUInt8'](0x5, 0);
        mes['writeInt16BE'](x, 1);
        mes['writeInt16BE'](y, 3);
        this.wsSend(mes);
    };
};

module.exports = bot;
