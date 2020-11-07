const c = require('chalk');
const md5 = require('md5');
const net = require('net');

const errors = require('./errors.json');

module.exports = class Penguin { // kinda messy (i want McDonald's so i dont have time to make it look fancy...)
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.packet_code = 99999;
    };

    async _createConnection(port) {
        this.socket = new net.Socket();
        this.socket.connect({host: 'server.cprewritten.net', port: port}, () => {
            this.socket.setEncoding('utf8')
        });
        this.socket.on('error', (err) => {
            return console.log(c.redBright(`Sorry, there was an error creating a connection to CPRewritten! Error: ${err.toString().replace('Error: ', "")}`));
        });
    };

    async send_verChk() {
        return new Promise(async (res, rej) => {
            this.request = "<msg t='sys'><body action='verChk' r='0'><ver v='153' /></body></msg>";
            await this.send_request();

            let response = await this.received();

            if (response.includes('apiOK')) {
                return res();
            } else if (response.includes('apiKO')) {
                console.log(c.redBright('[ERROR] Received apiKO!'));
                return rej();
            } else {
                console.log(c.redBright('[ERROR] Invalid verChk response!'));
                return rej();
            }

        }).catch(() => {
            console.log(c.redBright(`Terminating CPR Coin adder...`));
            return process.exit(-1);
        });
    };

    async send_rndK() {
        return new Promise(async (res, rej) => {
            this.request = '<msg t="sys"><body action="rndK" r="-1"></body></msg>';
            await this.send_request();

            let response = await this.received();

            if (!response.includes('rndK')) {
                console.log(c.redBright('[ERROR] Invalid rndK response!'));
                return rej();
            }

            this.rndK = /<k>(?:<!\[CDATA\[)?(.*?)(?:]]>)?<\/k>/g.exec(await response)[1]; // rndK which will be in group 1 of this regex.

            return res();
        }).catch(() => {
            console.log(c.redBright(`Terminating CPR Coin adder...`));
            return process.exit(-1);
        });
    };

    async _login() {
        this.banner(); // send banner
        console.log(c.magentaBright('[+] Logging in...'));
        await this._createConnection(6112);

        await this.send_verChk();
        await this.send_rndK();

        this.request = `<msg t="sys"><body action="login" r="0"><login z="w1"><nick><![CDATA[${this.username}]]></nick><pword><![CDATA[${this.handleCDATAHash(this.password)}]]></pword></login></body></msg>`;
        await this.send_request();

        await this.filterXTL(await this.received());
        let packet = this.xt_l_packet.split('%');

        this.id = packet[4]; // penguin id
        this.login_key = packet[5]; // login_key

        this.socket.destroy();
    };

    async _join_server() {
        await this._createConnection(6119);

        await this.send_verChk();
        await this.send_rndK();

        this.request = `<msg t="sys"><body action="login" r="0"><login z="w1"><nick><![CDATA[${this.username}]]></nick><pword><![CDATA[${this.handleCDATAHash(this.login_key, 'world') + this.login_key}]]></pword></login></body></msg>\0`;
        await this.send_request();

        await this.received();

        await this.send_xt('s', 'j#js', this.id, this.login_key, 'en');
        console.log(c.magentaBright(`[+] Successfully joined CPRewritten with account ${this.username}!\n`));
        await this._send_heartbeat();
    };

    async checkErr(packet) {
        packet = packet.split('%');
        if (packet[2] === 'e') {
            this.socket.destroy(); // close connection to tcp socket
            console.log(c.redBright(`[-] Error: ${errors[packet[4]]}`));
            return process.exit();
        }
    };

    async filterXTL(response) {
        for (const packet of response.split('\0')) if (packet.startsWith('%xt%l%')) return this.xt_l_packet = packet; // if packets get grouped.

        if (this.xt_l_packet === undefined) {
            let response = await this.received(); // get new response
            if (response.startsWith('%xt%l%')) return this.xt_l_packet = response.split('\0')[0]; // if it start's with %xt%l% set it as our data.
            this.xt_l_packet = response.split('\0')[1]; // but if it's an ssa, try packet [1] which will either be our %xt%l% response or empty.
        }

        if (this.xt_l_packet === '') return this.xt_l_packet = (await this.received()).split('\0')[0]; // has to be %xt%l% if all other's fail.
    };

    async send_request() {
        this.socket.write(this.request + '\0'); // request + delimiter
    };

    async fast_max() {
        return new Promise(async (res) => {

            let coins = 69420; // yes im comedic.

            console.log(c.magentaBright(`[+] Added ${coins} coins...`));

            await this.send_xt('s', 'j#jr', 912, 0, 0);
            await this.send_xt('z', 'zo', coins);

            setInterval(() => {
                if (this.added === true) res();
            }, 1000);

            this.added = false; // set to false so that new coins from packet can be received.

        });
    };

    async random_add() {
        return new Promise(async (res) => {

            let coins = this.ranCoin(2500);

            console.log(c.magentaBright(`[+] Randomly added ${coins} coins...`));

            await this.send_xt('s', 'j#jr', 912, 0, 0);
            await this.send_xt('z', 'zo', coins);

            setInterval(() => {
                if (this.added === true) res();
            }, 1000);

            this.added = false; // set to false so that new coins from packet can be received.

        });
    };

    async addCoins(amount) {
        return new Promise(async (res, rej) => {

            this.isNum = /^\d+$/.test(amount);
            if (amount < 5 || amount >= 100000 || this.isNum === false) return rej();

            console.log(c.magentaBright(`[+] Adding ${amount} coins...`));

            await this.send_xt('s', 'j#jr', 912, 0, 0);
            await this.send_xt('z', 'zo', amount);

            setInterval(() => {
                if (this.added === true) res();
            }, 1000);

            this.added = false; // set to false so that new coins from packet can be received.

        }).catch(() => {
            if (amount < 5) console.log(c.redBright('[-] Add more coins!\n'));
            if (amount >= 100000) console.log(c.redBright('[-] Are you trying to get banned?\n'));
            if (this.isNum === false) console.log(c.redBright('[-] Numbers only!\n'));
        });
    };

    async send_xt(...args) {
        args.splice(2, 0, (this.packet_code + 669567) ^ 842215, -1);
        this.packet_code++;
        let packet = `%xt%${args.join('%')}%\0`; // yes, pain.
        this.socket.write(packet);
    };

    ranCoin(max) {
        return Math.floor(Math.random() * Math.floor(max));
    };

    _send_heartbeat() {
        setInterval(async () => {
            await this.send_xt("s", "u#h");
        }, 60000);
    };

    handleCDATAHash(password, arg) {
        if (arg === 'world') {
            password += this.rndK;
            password = md5(password)
            return password.substr(16, 16) + password.substr(0, 16);
        }
        password = md5(password).toUpperCase();
        password = password.substr(16, 16) + password.substr(0, 16);
        password += this.rndK; // rndK key
        password += 'Y(02.>\'H}t":E1'; // magic
        password = md5(password);
        return password.substr(16, 16) + password.substr(0, 16);
    };

    start_listener() { // listen for specific packets
        this.socket.on('data', async (data) => {
            let packets = data.split('\0');
            for (let packet of packets) {
                if (packet !== '') await this.checkErr(packet);
                if (packet.startsWith('%xt%lp%')) {
                    this.coins = packet.split('%')[5]; // get coins from player string
                    console.log(c.magentaBright(`Username: ${this.username}`));
                    console.log(c.yellowBright(`Current Coins: ${this.coins}\n`));
                    if (this.coins >= 16777215) {
                        console.log(c.magentaBright('[+] You\'re at max coins!'));
                        return process.exit();
                    }
                } else if (packet.startsWith('%xt%zo%')) {
                    this.coins = packet.split('%')[4];
                    console.log(c.magentaBright('[+] Done!'))
                    console.log(c.yellowBright(`Current Coins: ${this.coins}\n`));
                    this.added = true;
                    if (this.coins >= 16777215) {
                        console.log(c.magentaBright('[+] You\'re at max coins!'));
                        return process.exit();
                    }
                }
            }
        });
    };

    received() {
        return new Promise((res) => {
            this.socket.on('data', async (data) => {
                this.socket.removeAllListeners('data'); // remove data listener (better way to do this? idc.)
                await this.checkErr(data);
                return res(data);
            });
        });
    };

    banner() {
        console.log(c.blueBright(`       
   ___ ___ ___    ___     _          _      _    _         
  / __| _ \\ _ \\  / __|___(_)_ _     /_\\  __| |__| |___ _ _ 
 | (__|  _/   / | (__/ _ \\ | ' \\   / _ \\/ _\` / _\` / -_) '_|
  \\___|_| |_|_\\  \\___\\___/_|_||_| /_/ \\_\\__,_\\__,_\\___|_|  
                  created by benji#1337                           
                                                                         `));
    };
};
