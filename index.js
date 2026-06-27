const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE';

let userMoney = {};
let userBank = {};

// Emoji ID ban cung cap
const quanchuon = "<:quanchuon:1520358957041057883>";
const vuacacclb = "<:vuacacclb:1520358954805362688>";
const saucaulacbo = "<:saucaulacbo:152035892888438845>";
const batimtim = "<:batimtim:1520358951068110980>";
const aceofspades = "<:aceofspades:1520358948832673852>";
const nuhoangcuatraitim = "<:nuhoangcua traitim:1520358946517422232>";
const tenofhearts = "<:tenofhearts:1520358944931844166>";
const haitraitim = "<:haitraitim:1520358943078219846>";
const namlabai = "<:namlabai:1520358941110833192>";
const chinchlb = "<:chinclb:1520358939336638594>";
const bayco = "<:bayco:1520358937537282088>";
const bonlabai = "<:bonlabai:1520358935381413950>";
const tamco = "<:tamco:1520358932319572039>";
const VN = "<:VN:1520349264700506293>";

// Map la bai sang emoji - CHI DUNG EMOJI ID
const cardEmojis = {
    'A♠': aceofspades,
    '2♥': haitraitim,
    '3♥': batimtim,
    '4♥': bonlabai,
    '5♥': namlabai,
    '10♥': tenofhearts,
    'Q♥': nuhoangcuatraitim,
    '6♣': saucaulacbo,
    '7♣': bayco,
    '8♣': tamco,
    '9♣': chinchlb,
    'K♣': vuacacclb,
    '2♣': quanchuon
};

function createDeck() {
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (let suit of suits) {
        for (let value of values) {
            deck.push(value + suit);
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateBaiCaoScore(cards) {
    let total = 0;
    for (let card of cards) {
        const value = card.slice(0, -1);
        if (['J', 'Q', 'K'].includes(value)) {
            total += 0;
        } else if (value === 'A') {
            total += 1;
        } else {
            total += parseInt(value);
        }
    }
    return total % 10;
}

function getCardEmoji(card) {
    return cardEmojis[card] || '';
}

function handleMoney(message) {
    const userId = message.author.id;
    const money = userMoney[userId] || 0;
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💰 SO TIEN CUA BAN')
        .setDescription(`${VN} **Tien mat:** $${money.toLocaleString()}`)
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

function handleBank(message) {
    const userId = message.author.id;
    const bank = userBank[userId] || 0;
    
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏦 NGAN HANG CUA BAN')
        .setDescription(`${VN} **So du ngan hang:** $${bank.toLocaleString()}`)
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

function handleBaiCao(message, args) {
    const userId = message.author.id;
    
    if (!userMoney[userId]) {
        userMoney[userId] = 10000;
        userBank[userId] = 0;
    }
    
    if (!args[0]) {
        return message.channel.send('❌ Vui long nhap so tien cuoc! Su dung: `.baicao [so tien]`');
    }
    
    const betAmount = parseInt(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.channel.send('❌ So tien khong hop le!');
    }
    
    if (betAmount > userMoney[userId]) {
        return message.channel.send(`❌ Ban khong du tien! Ban chi co ${VN} $${userMoney[userId].toLocaleString()}`);
    }
    
    let deck = shuffleDeck(createDeck());
    
    const playerCards = [deck.pop(), deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop(), deck.pop()];
    
    const playerScore = calculateBaiCaoScore(playerCards);
    const dealerScore = calculateBaiCaoScore(dealerCards);
    
    let result = '';
    
    if (playerScore > dealerScore) {
        result = '🎉 THANG!';
        userMoney[userId] += betAmount;
    } else if (playerScore < dealerScore) {
        result = '💀 THUA!';
        userMoney[userId] -= betAmount;
    } else {
        result = '🤝 HOA! (Nha cai thang)';
        userMoney[userId] -= betAmount;
    }
    
    const playerCardsStr = playerCards.map(c => getCardEmoji(c)).filter(e => e).join(' ');
    const dealerCardsStr = dealerCards.map(c => getCardEmoji(c)).filter(e => e).join(' ');
    
    const embed = new EmbedBuilder()
        .setColor(playerScore > dealerScore ? 0x00FF00 : 0xFF0000)
        .setTitle('🃏 BAI CAO')
        .addFields(
            { name: '📌 Bai cua ban:', value: `${playerCardsStr}\n**Diem:** ${playerScore}`, inline: true },
            { name: '🤖 Bai nha cai:', value: `${dealerCardsStr}\n**Diem:** ${dealerScore}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '💵 Tien cuoc:', value: `${VN} $${betAmount.toLocaleString()}`, inline: true },
            { name: '📊 Ket qua:', value: result, inline: true },
            { name: '💰 So du:', value: `${VN} $${userMoney[userId].toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'Diem cao nhat la 9' })
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

function handlePocker(message, args) {
    const userId = message.author.id;
    
    if (!userMoney[userId]) {
        userMoney[userId] = 10000;
        userBank[userId] = 0;
    }
    
    if (!args[0]) {
        return message.channel.send('❌ Vui long nhap so tien cuoc! Su dung: `.pocker [so tien]`');
    }
    
    const betAmount = parseInt(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.channel.send('❌ So tien khong hop le!');
    }
    
    if (betAmount > userMoney[userId]) {
        return message.channel.send(`❌ Ban khong du tien! Ban chi co ${VN} $${userMoney[userId].toLocaleString()}`);
    }
    
    let deck = shuffleDeck(createDeck());
    
    const playerCards = [deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop()];
    
    const playerStrength = evaluatePockerHand(playerCards);
    const dealerStrength = evaluatePockerHand(dealerCards);
    
    let result = '';
    
    if (playerStrength.value > dealerStrength.value) {
        result = '🎉 THANG!';
        userMoney[userId] += betAmount;
    } else if (playerStrength.value < dealerStrength.value) {
        result = '💀 THUA!';
        userMoney[userId] -= betAmount;
    } else {
        result = '🤝 HOA!';
    }
    
    const playerCardsStr = playerCards.map(c => getCardEmoji(c)).filter(e => e).join(' ');
    const dealerCardsStr = dealerCards.map(c => getCardEmoji(c)).filter(e => e).join(' ');
    
    const embed = new EmbedBuilder()
        .setColor(playerStrength.value > dealerStrength.value ? 0x00FF00 : 0xFF0000)
        .setTitle('🃏 POKER')
        .addFields(
            { name: '📌 Bai cua ban:', value: `${playerCardsStr}\n**Suc manh:** ${playerStrength.name}`, inline: true },
            { name: '🤖 Bai nha cai:', value: `${dealerCardsStr}\n**Suc manh:** ${dealerStrength.name}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '💵 Tien cuoc:', value: `${VN} $${betAmount.toLocaleString()}`, inline: true },
            { name: '📊 Ket qua:', value: result, inline: true },
            { name: '💰 So du:', value: `${VN} $${userMoney[userId].toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'Poker - So sanh 2 la bai' })
        .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
}

function evaluatePockerHand(cards) {
    const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    
    const card1Value = values[cards[0].slice(0, -1)];
    const card2Value = values[cards[1].slice(0, -1)];
    const card1Suit = cards[0].slice(-1);
    const card2Suit = cards[1].slice(-1);
    
    if (card1Value === card2Value) {
        return { name: 'DOI', value: card1Value + 20 };
    }
    
    if (card1Suit === card2Suit) {
        return { name: 'CUNG CHAT', value: Math.max(card1Value, card2Value) + 10 };
    }
    
    return { name: 'CAO', value: Math.max(card1Value, card2Value) };
}

client.once('ready', () => {
    console.log(`✅ Da dang nhap: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    switch(command) {
        case 'money':
            handleMoney(message);
            break;
        case 'bank':
            handleBank(message);
            break;
        case 'baicao':
            handleBaiCao(message, args);
            break;
        case 'pocker':
            handlePocker(message, args);
            break;
    }
});

client.login(TOKEN).catch(err => {
    console.error('❌ Loi dang nhap:', err);
});
