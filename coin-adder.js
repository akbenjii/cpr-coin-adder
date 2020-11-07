const c = require('chalk');
const Penguin = require('./src/client');
const prompt = require('prompt-sync')({sigint: true});

const credentials = require('./config.json');

const username = credentials['cpr-username'];
const password = credentials['cpr-password'];

(async () => {

    const client = new Penguin(username, password);

    await client._login();
    await client._join_server();

    await client.start_listener();
    await ms(1000);

    console.log(c.redBright("REMEMBER: It's recommended you use an alt add coins wisely."));
    console.log(c.blueBright('[1] Random Amount. \n[2] Custom Amount.'));

    let completePrompt = false;

    while (completePrompt === false) {
        const option = prompt(c.magentaBright('Method: '));

        switch (option) {
            case '1':
                console.log(c.magentaBright('\n[+] Loading random coin adder...'));
                completePrompt = true;
                setInterval(async () => {
                    await client.random_add()
                }, 3500);
                break;
            case '2':
                console.log(c.magentaBright('\n[+] Starting coin adder...'));
                completePrompt = true;
                while (true) {
                    let add_amount = prompt(c.yellowBright('How many coins? '));
                    await client.addCoins(add_amount);
                }
            default:
                console.log(c.redBright("[-] Sorry, that option doesn't exist."));
        }
    }

})();

function ms(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}