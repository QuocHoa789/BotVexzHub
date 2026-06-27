const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ========== CONFIG ==========
const CONFIG = {
    token: process.env.TOKEN || "YOUR_BOT_TOKEN_HERE",
    dataFile: path.join(__dirname, 'userdata.json')
};

// ========== ICON TIỀN ==========
const MONEY_ICON = '<:VN:1520349264700506293>';

// ========== BỘ BÀI ==========
const boBai = [
    { id: "2_co", ten: "haitraitim", emojiId: "1520358943078219846", diem: 2 },
    { id: "3_co", ten: "batraitim", emojiId: "152035895106810980", diem: 3 },
    { id: "4_bich", ten: "bonlabai", emojiId: "1520358935381413950", diem: 4 },
    { id: "5_bich", ten: "namlabai", emojiId: "1520358941110833192", diem: 5 },
    { id: "6_bich", ten: "saulabai", emojiId: "152035892888438845", diem: 6 },
    { id: "7_chuon", ten: "baycaulacbo", emojiId: "1520358937537282088", diem: 7 },
    { id: "8_co", ten: "tamco", emojiId: "1520358932319572039", diem: 8 },
    { id: "9_chuon", ten: "chincaulacbo", emojiId: "1520358939336638594", diem: 9 },
    { id: "10_co", ten: "tenofhearts", emojiId: "1520358944931844166", diem: 10 },
    { id: "J_chuon", ten: "jackofclubs1", emojiId: "1520358954805362688", diem: 10 },
    { id: "Q_co", ten: "nuhoangcuatraitim", emojiId: "1520358946517422232", diem: 10 },
    { id: "K_chuon", ten: "vuacuacaccaulacbo", emojiId: "1520358957041057883", diem: 10 },
    { id: "A_bich", ten: "aceofspades", emojiId: "1520358948832673852", diem: 11 }
];

// ========== CLASS CARDGAME ==========
class CardGame {
    constructor() { this.deck = []; this.resetDeck(); }
    resetDeck() { this.deck = [...boBai]; this.shuffle(); }
    shuffle() { for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; } }
    drawCard() { if (this.deck.length === 0) this.resetDeck(); return this.deck.pop(); }
    drawHand(numCards) { return Array.from({ length: numCards }, () => this.drawCard()); }
}

// ========== LOGIC BÀI CÀO ==========
function calculateScore(cards) { let total = 0; for (let card of cards) total += card.diem; return total % 10; }
function getScoreName(score) { const names = { 0: '0 Điểm', 1: '1 Điểm', 2: '2 Điểm', 3: '3 Điểm', 4: '4 Điểm', 5: '5 Điểm', 6: '6 Điểm', 7: '7 Điểm', 8: '8 Điểm', 9: '9 Điểm (Cào!)' }; return names[score] || `${score} Điểm`; }
function checkSpecial(cards) { const ids = cards.map(c => c.id.split('_')[0]); const uniqueIds = new Set(ids); if (uniqueIds.size === 1) return 'SÁP 🔥'; if (ids.every(v => ['J', 'Q', 'K'].includes(v))) return '3 TÂY 👑'; return null; }
function getCardDisplay(card) { return `<:${card.ten}:${card.emojiId}>`; }

// ========== QUẢN LÝ TIỀN ==========
let userMoney = new Map();

function loadData() {
    try {
        if (fs.existsSync(CONFIG.dataFile)) {
            const rawData = fs.readFileSync(CONFIG.dataFile, 'utf8');
            const parsedData = JSON.parse(rawData);
            userMoney = new Map(Object.entries(parsedData));
            console.log(`✅ Đã tải dữ liệu ${userMoney.size} người dùng!`);
        } else { saveData(); }
    } catch (error) { console.error('❌ Lỗi tải dữ liệu:', error.message); userMoney = new Map(); }
}

function saveData() { try { const obj = Object.fromEntries(userMoney); fs.writeFileSync(CONFIG.dataFile, JSON.stringify(obj, null, 2), 'utf8'); } catch (error) { console.error('❌ Lỗi lưu dữ liệu:', error.message); } }

function getMoney(userId) { if (!userMoney.has(userId)) { userMoney.set(userId, 10000); saveData(); } return userMoney.get(userId); }
function addMoney(userId, amount) { const current = getMoney(userId); userMoney.set(userId, current + amount); saveData(); }
function deductMoney(userId, amount) { const current = getMoney(userId); if (current < amount) return false; userMoney.set(userId, current - amount); saveData(); return true; }

// ========== DAILY COOLDOWN ==========
const dailyCooldown = new Map();
function canUseDaily(userId) {
    const now = Date.now();
    const lastUsed = dailyCooldown.get(userId) || 0;
    const cooldownTime = 5400000;
    if (now - lastUsed < cooldownTime) {
        const remaining = cooldownTime - (now - lastUsed);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return { canUse: false, timeStr: `${hours}h ${minutes}m ${seconds}s` };
    }
    return { canUse: true };
}

// ========== THÁCH ĐẤU ==========
const challenges = new Map();

// ========== CÁC HÀM XỬ LÝ LỆNH ==========

// ===== LỆNH .help =====
function handleHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📜 DANH SÁCH LỆNH BOT BÀI CÀO')
        .setDescription('Chào mừng bạn đến với Bot Bài Cào! Dưới đây là các lệnh có sẵn:')
        .addFields(
            { name: '💰 `.money`', value: 'Kiểm tra số dư tài khoản của bạn', inline: false },
            { name: '🎁 `.daily`', value: 'Nhận 5,000 VNĐ miễn phí (1 lần mỗi 1h30p)', inline: false },
            { name: '🏦 `.bank @user <số_tiền>`', value: 'Chuyển tiền cho người khác (tối thiểu 100 VNĐ)\n**Ví dụ:** `.bank @user 1000`', inline: false },
            { name: '🃏 `.cao <số_tiền>`', value: 'Chơi bài cào với Bot (cược tối thiểu 100 VNĐ)\n**Ví dụ:** `.cao 500`', inline: false },
            { name: '⚔️ `.cao @user <số_tiền>`', value: 'Thách đấu người khác chơi bài cào\n**Ví dụ:** `.cao @user 1000`\n⏰ Đối thủ có 60 giây để chấp nhận', inline: false }
        )
        .addFields({
            name: '🎯 Luật chơi Bài Cào',
            value: '• Mỗi người nhận 3 lá bài\n• Điểm = tổng điểm 3 lá % 10\n• **Sáp 🔥**: 3 lá giống nhau (thắng tuyệt đối)\n• **3 Tây 👑**: J, Q, K (thắng thường)\n• Điểm cao hơn thắng',
            inline: false
        })
        .setFooter({ text: 'Chúc bạn chơi vui vẻ! 🎉' })
        .setTimestamp();
    return message.reply({ embeds: [embed] });
}

// ===== LỆNH .money =====
function handleMoney(message) {
    const money = getMoney(message.author.id);
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`💰 ${message.author.username}`)
        .setDescription(`${MONEY_ICON} **${money.toLocaleString('vi-VN')} VNĐ**`);
    return message.reply({ embeds: [embed] });
}

// ===== LỆNH .daily =====
function handleDaily(message) {
    const check = canUseDaily(message.author.id);
    if (!check.canUse) return message.reply(`⏰ Bạn đã nhận daily rồi! Hãy đợi **${check.timeStr}** nữa.`);
    dailyCooldown.set(message.author.id, Date.now());
    addMoney(message.author.id, 5000);
    const money = getMoney(message.author.id);
    return message.reply(`🎁 Nhận **5,000 ${MONEY_ICON}** thành công!\n💰 Số dư: ${MONEY_ICON} **${money.toLocaleString('vi-VN')} VNĐ**\n⏰ Lần sau: **1h30p** nữa`);
}

// ===== LỆNH .bank =====
function handleBank(message) {
    const args = message.content.split(' ');
    args.shift();
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Vui lòng tag người nhận! `.bank @user <số_tiền>`');
    if (targetUser.id === message.author.id) return message.reply('❌ Không thể chuyển cho chính mình!');
    if (targetUser.bot) return message.reply('❌ Không thể chuyển cho bot!');
    const mentionIndex = args.findIndex(a => a.includes(targetUser.id));
    if (mentionIndex !== -1) args.splice(mentionIndex, 1);
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 100) return message.reply('❌ Số tiền chuyển tối thiểu **100 VNĐ**!');
    if (!deductMoney(message.author.id, amount)) {
        const currentMoney = getMoney(message.author.id);
        return message.reply(`❌ Không đủ tiền! Số dư: ${MONEY_ICON} **${currentMoney.toLocaleString('vi-VN')} VNĐ**`);
    }
    addMoney(targetUser.id, amount);
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🏦 Chuyển Tiền Thành Công!')
        .setDescription(`${message.author} ──💸 **${amount.toLocaleString('vi-VN')} ${MONEY_ICON}**──> ${targetUser}`)
        .addFields(
            { name: `💰 ${message.author.username}`, value: `Còn: ${MONEY_ICON} **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ**`, inline: true },
            { name: `💰 ${targetUser.username}`, value: `Có: ${MONEY_ICON} **${getMoney(targetUser.id).toLocaleString('vi-VN')} VNĐ**`, inline: true }
        )
        .setTimestamp();
    return message.reply({ embeds: [embed] });
}

// ===== LỆNH .cao (Chơi với bot) =====
function handlePlayWithBot(message) {
    const args = message.content.split(' ');
    const bet = parseInt(args[1]);
    if (isNaN(bet) || bet < 100) return message.reply('❌ Cược tối thiểu **100 VNĐ**!');
    if (getMoney(message.author.id) < bet) return message.reply(`❌ Không đủ tiền! Số dư: ${MONEY_ICON} **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ**`);
    deductMoney(message.author.id, bet);
    const game = new CardGame();
    const playerCards = game.drawHand(3);
    const botCards = game.drawHand(3);
    const playerScore = calculateScore(playerCards);
    const botScore = calculateScore(botCards);
    const playerSpecial = checkSpecial(playerCards);
    const botSpecial = checkSpecial(botCards);
    const playerDisplay = playerCards.map(c => getCardDisplay(c)).join(' ');
    const botDisplay = botCards.map(c => getCardDisplay(c)).join(' ');
    let result = '', color = '', winAmount = 0;
    if (playerSpecial && !botSpecial) { result = 'THẮNG (Sáp!)'; color = '#FFD700'; winAmount = bet * 2; }
    else if (!playerSpecial && botSpecial) { result = 'THUA'; color = '#FF0000'; winAmount = 0; }
    else if (playerSpecial && botSpecial) {
        if (playerSpecial === botSpecial) { result = 'HÒA'; color = '#FFFF00'; winAmount = bet; }
        else { if (playerScore > botScore) { result = 'THẮNG'; color = '#FFD700'; winAmount = bet * 2; } else { result = 'THUA'; color = '#FF0000'; winAmount = 0; } }
    } else {
        if (playerScore > botScore) { result = 'THẮNG'; color = '#FFD700'; winAmount = bet * 2; }
        else if (playerScore < botScore) { result = 'THUA'; color = '#FF0000'; winAmount = 0; }
        else { result = 'HÒA'; color = '#FFFF00'; winAmount = bet; }
    }
    if (winAmount > 0) addMoney(message.author.id, winAmount);
    const displayAmount = winAmount > bet ? `+ **${winAmount.toLocaleString()} ${MONEY_ICON}**` : winAmount === bet ? `Hoàn **${bet.toLocaleString()} ${MONEY_ICON}**` : `Mất **${bet.toLocaleString()} ${MONEY_ICON}**`;
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🃏 Bài Cào - ${result}!`)
        .setDescription(`Cược: **${bet.toLocaleString()} ${MONEY_ICON}**`)
        .addFields(
            { name: `👤 ${message.author.username}`, value: `${playerDisplay}\n${playerSpecial ? `**${playerSpecial}** + ` : ''}${getScoreName(playerScore)}`, inline: true },
            { name: `🤖 Bot`, value: `${botDisplay}\n${botSpecial ? `**${botSpecial}** + ` : ''}${getScoreName(botScore)}`, inline: true },
            { name: '💰 Kết quả', value: displayAmount, inline: false }
        )
        .setFooter({ text: `Số dư: ${MONEY_ICON} ${getMoney(message.author.id).toLocaleString()} VNĐ` });
    return message.reply({ embeds: [embed] });
}

// ===== LỆNH .cao @người (Thách đấu) =====
function handleChallenge(message) {
    const args = message.content.split(' ');
    args.shift();
    const targetUser = message.mentions.users.first();
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) return message.reply('❌ Tag người thật để thách đấu!');
    const myBet = parseInt(args[args.length - 1]);
    if (isNaN(myBet) || myBet < 100) return message.reply('❌ Cược tối thiểu 100 VNĐ!');
    
    const reverseKey = targetUser.id + '_' + message.author.id;
    if (challenges.has(reverseKey)) {
        const existingChallenge = challenges.get(reverseKey);
        challenges.delete(reverseKey);
        const p1Bet = existingChallenge.amount;
        const p2Bet = myBet;
        
        if (!deductMoney(targetUser.id, p1Bet)) {
            return message.reply(`❌ ${targetUser.username} không đủ tiền để chấp nhận thách đấu! Cần **${p1Bet.toLocaleString()} ${MONEY_ICON}**`);
        }
        
        const totalPool = p1Bet + p2Bet;
        const game = new CardGame();
        const p1Cards = game.drawHand(3);
        const p2Cards = game.drawHand(3);
        const p1Score = calculateScore(p1Cards);
        const p2Score = calculateScore(p2Cards);
        const p1Special = checkSpecial(p1Cards);
        const p2Special = checkSpecial(p2Cards);
        const p1Display = p1Cards.map(c => getCardDisplay(c)).join(' ');
        const p2Display = p2Cards.map(c => getCardDisplay(c)).join(' ');
        let winner = null, resultText = '', color = '';
        if (p1Special && !p2Special) { winner = targetUser; color = '#FFD700'; resultText = targetUser.username + ' THẮNG (Sáp!)'; }
        else if (!p1Special && p2Special) { winner = message.author; color = '#FFD700'; resultText = message.author.username + ' THẮNG (Sáp!)'; }
        else if (p1Special && p2Special) {
            if (p1Special === p2Special) {
                if (p1Score > p2Score) { winner = targetUser; color = '#FFD700'; resultText = targetUser.username + ' THẮNG!'; }
                else if (p2Score > p1Score) { winner = message.author; color = '#FFD700'; resultText = message.author.username + ' THẮNG!'; }
                else { color = '#FFFF00'; resultText = 'HÒA!'; }
            } else {
                if (p1Special === 'SÁP 🔥') { winner = targetUser; color = '#FFD700'; resultText = targetUser.username + ' THẮNG (Sáp)!'; }
                else { winner = message.author; color = '#FFD700'; resultText = message.author.username + ' THẮNG (Sáp)!'; }
            }
        } else {
            if (p1Score > p2Score) { winner = targetUser; color = '#FFD700'; resultText = targetUser.username + ' THẮNG!'; }
            else if (p2Score > p1Score) { winner = message.author; color = '#FFD700'; resultText = message.author.username + ' THẮNG!'; }
            else { color = '#FFFF00'; resultText = 'HÒA!'; }
        }
        if (winner) { addMoney(winner.id, totalPool); resultText += `\n💰 Nhận ${totalPool.toLocaleString()} ${MONEY_ICON}`; }
        else { addMoney(targetUser.id, p1Bet); addMoney(message.author.id, p2Bet); resultText += '\n💰 Hoàn cược!'; }
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⚔️ KẾT QUẢ THÁCH ĐẤU!')
            .setDescription(targetUser.username + ' cược: ' + p1Bet.toLocaleString() + ` ${MONEY_ICON}\n` + message.author.username + ' cược: ' + p2Bet.toLocaleString() + ` ${MONEY_ICON}\n` + 'Tổng: ' + totalPool.toLocaleString() + ` ${MONEY_ICON}`)
            .addFields(
                { name: '👤 ' + targetUser.username, value: p1Display + '\n' + (p1Special ? '**' + p1Special + '** + ' : '') + getScoreName(p1Score), inline: true },
                { name: '👤 ' + message.author.username, value: p2Display + '\n' + (p2Special ? '**' + p2Special + '** + ' : '') + getScoreName(p2Score), inline: true },
                { name: '🏆 Kết quả', value: resultText, inline: false }
            )
            .setTimestamp();
        return message.reply({ content: targetUser.toString(), embeds: [embed] });
    } else {
        if (!deductMoney(message.author.id, myBet)) {
            return message.reply(`❌ Không đủ tiền để thách đấu! Số dư: ${MONEY_ICON} **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ**`);
        }
        
        const challengeKey = message.author.id + '_' + targetUser.id;
        challenges.set(challengeKey, { 
            challenger: message.author.id, 
            target: targetUser.id, 
            amount: myBet, 
            time: Date.now(),
            channel: message.channel.id 
        });
        
        setTimeout(() => { 
            if (challenges.has(challengeKey)) {
                const challenge = challenges.get(challengeKey);
                challenges.delete(challengeKey);
                addMoney(challenge.challenger, challenge.amount);
                message.channel.send(`⏰ <@${challenge.challenger}> thách đấu <@${challenge.target}> nhưng hết hạn!\n💰 Đã hoàn **${challenge.amount.toLocaleString()} ${MONEY_ICON}** cho <@${challenge.challenger}>`);
            }
        }, 60000);
        
        return message.reply('⚔️ **THÁCH ĐẤU BÀI CÀO!**\n\n' + message.author.toString() + ' muốn đấu với ' + targetUser.toString() + `\n💰 ` + message.author.username + ' cược: ' + myBet.toLocaleString() + ` ${MONEY_ICON}\n👉 ` + targetUser.toString() + ' gõ: `.cao @' + message.author.username + ' <tiền>` để chấp nhận!\n⏰ Hết hạn sau 60 giây!');
    }
}

// ========== BOT EVENTS ==========
// ✅ FIX: Dùng 'clientReady' thay vì 'ready' để tránh warning
client.once('clientReady', () => {
    console.log(`✅ Da dang nhap: ${client.user.tag} - Bot Bai Cao!`);
    loadData();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    if (content === '.help') return handleHelp(message);
    if (content === '.money') return handleMoney(message);
    if (content === '.daily') return handleDaily(message);
    if (content.startsWith('.bank')) return handleBank(message);
    if (content.startsWith('.cao') && !message.mentions.users.size) return handlePlayWithBot(message);
    if (content.startsWith('.cao') && message.mentions.users.size) return handleChallenge(message);
});

// ========== XỬ LÝ LỖI GLOBAL ==========
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

client.login(CONFIG.token);
