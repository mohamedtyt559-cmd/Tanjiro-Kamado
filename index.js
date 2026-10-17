const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');

async function startTanjiroBot() {
    // 1. إعداد الجلسة والتوثيق
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    // 2. إنشاء اتصال الاتصال
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    // 3. طلب كود الاقتران أوتوماتيكياً وطباعته في الـ Logs
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(config.PAIRING_NUMBER || '201093468758');
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n=================================`);
                console.log(`🔥 PAIRING CODE FOR TANJIRO BOT: ${code}`);
                console.log(`=================================\n`);
            } catch (err) {
                console.error('❌ خطأ في طلب كود الاقتران:', err);
            }
        }, 3000);
    }

    // 4. متابعة حالة الاتصال
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ تم اتصال إمبراطورية تانجيرو بنجاح!');
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 جاري إعادة الاتصال بالبوت...');
            if (shouldReconnect) startTanjiroBot();
        }
    });

    // 5. الأوامر والرسائل
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const type = Object.keys(msg.message)[0];
            const body = type === 'conversation' ? msg.message.conversation : 
                         type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : '';

            const prefix = '.';
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            switch (command) {
                case 'ping':
                case 'بنغ':
                    await sock.sendMessage(from, { text: '🥷🏻 البوت شغال بأعلى سرعة يا إمبراطور!' }, { quoted: msg });
                    break;
                case 'الاوامر':
                case 'menu':
                    await sock.sendMessage(from, { text: `🥷🏻 *إمبراطورية تانجيرو*\n\nالبوت متصل وجاهز للاستخدام!` }, { quoted: msg });
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    });
}

startTanjiroBot();
