const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const express = require('express');

// ============ WEB SERVER ============
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Bot Bài Cào đang hoạt động!');
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        users: Object.keys(data.users || {}).length 
    });
});

app.listen(PORT, () => {
    console.log(`✅ Web server chạy tại port ${PORT}`);
});

// ============ CẤU HÌNH BOT ============
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const DATA_FILE = './data.json';

// ============ ADMIN ID ============
const ADMIN_ID = '1486380909736366120';
const ADMIN_DEFAULT_REWARD = 500000;

// ============ ICON TIỀN ============
const nuocngot = "<:nuocngot:1520349264700506293>";

// ============ BANK FEE = 5% ============
const BANK_FEE_PERCENT = 0.05;

// ============ LOAD DỮ LIỆU ============
let data = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!data.users) data.users = {};
        if (!data.dailyCooldown) data.dailyCooldown = {};
        if (!data.blacklist) data.blacklist = {};
        console.log(`✅ Đã tải dữ liệu ${Object.keys(data.users).length} người dùng!`);
    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu:', error.message);
        data = { users: {}, dailyCooldown: {}, blacklist: {} };
    }
} else {
    data = { users: {}, dailyCooldown: {}, blacklist: {} };
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Lỗi lưu dữ liệu:', error.message);
    }
}

function initUser(userId) {
    if (!data.users[userId]) {
        data.users[userId] = {
            money: 10000,
            bank: 0,
            lastDaily: 0,
            lastActivity: 0,
            losses: []
        };
        saveData();
    } else {
        if (!data.users[userId].losses) data.users[userId].losses = [];
        if (!data.users[userId].lastActivity) data.users[userId].lastActivity = 0;
    }
}

function getMoney(userId) {
    initUser(userId);
    return data.users[userId].money;
}

function addMoney(userId, amount) {
    initUser(userId);
    data.users[userId].money += amount;
    saveData();
}

function deductMoney(userId, amount) {
    initUser(userId);
    if (data.users[userId].money < amount) return false;
    data.users[userId].money -= amount;
    saveData();
    return true;
}

function recordActivity(userId) {
    initUser(userId);
    data.users[userId].lastActivity = Date.now();
    saveData();
}

function recordLoss(userId, amount, game) {
    initUser(userId);
    if (!data.users[userId].losses) data.users[userId].losses = [];
    data.users[userId].losses.push({
        time: Date.now(),
        amount: amount,
        game: game
    });
    if (data.users[userId].losses.length > 100) {
        data.users[userId].losses = data.users[userId].losses.slice(-100);
    }
    saveData();
}

// ============ BLACKLIST SYSTEM ============
function isBlacklisted(userId) {
    if (!data.blacklist[userId]) return { isBl: false };
    
    const bl = data.blacklist[userId];
    
    if (bl.permanent) {
        return { isBl: true, permanent: true, by: bl.by, reason: bl.reason };
    }
    
    if (bl.until && Date.now() > bl.until) {
        delete data.blacklist[userId];
        saveData();
        return { isBl: false };
    }
    
    return { 
        isBl: true, 
        permanent: false, 
        until: bl.until, 
        by: bl.by, 
        reason: bl.reason 
    };
}

function setBlacklist(userId, duration, by, reason = 'Vi phạm quy định') {
    if (!data.blacklist) data.blacklist = {};
    
    if (duration === 'permanent' || duration <= 0) {
        data.blacklist[userId] = {
            permanent: true,
            by: by,
            reason: reason,
            time: Date.now()
        };
    } else {
        data.blacklist[userId] = {
            permanent: false,
            until: Date.now() + duration,
            by: by,
            reason: reason,
            time: Date.now()
        };
    }
    saveData();
}

function removeBlacklist(userId) {
    if (!data.blacklist) data.blacklist = {};
    delete data.blacklist[userId];
    saveData();
}

// ============ ANTI-SPAM SYSTEM ============
const spamTracker = new Map();
const SPAM_COMMANDS = ['.cao', '.bank', '.hoantien', '.tx', '.help'];
const SPAM_THRESHOLD = 7;
const SPAM_WINDOW = 1000;

function checkSpam(userId, command) {
    const isGameCommand = SPAM_COMMANDS.some(cmd => command.startsWith(cmd));
    if (!isGameCommand) return { isSpam: false };
    
    const now = Date.now();
    
    if (!spamTracker.has(userId)) {
        spamTracker.set(userId, []);
    }
    
    const timestamps = spamTracker.get(userId);
    const recentTimestamps = timestamps.filter(t => now - t < SPAM_WINDOW);
    recentTimestamps.push(now);
    spamTracker.set(userId, recentTimestamps);
    
    if (recentTimestamps.length >= SPAM_THRESHOLD) {
        const minDuration = 60 * 1000;
        const maxDuration = 90 * 60 * 1000;
        const duration = Math.floor(minDuration + Math.random() * (maxDuration - minDuration));
        
        setBlacklist(userId, duration, 'SYSTEM', 'Spam lệnh bot');
        spamTracker.delete(userId);
        
        return { isSpam: true, duration: duration };
    }
    
    return { isSpam: false };
}

// ============ BỘ BÀI 13 LÁ ============
const boBai = [
    { id: "2_co", ten: "haitraitim", emojiId: "1520358943078219846", diem: 2 },
    { id: "3_co", ten: "batraitim", emojiId: "1520358951068110980", diem: 3 },
    { id: "4_bich", ten: "bonlabai", emojiId: "1520358935381413950", diem: 4 },
    { id: "5_bich", ten: "namlabai", emojiId: "1520358941110833192", diem: 5 },
    { id: "6_bich", ten: "saucaulacbo", emojiId: "1520358952888438845", diem: 6 },
    { id: "7_chuon", ten: "baycaulacbo", emojiId: "1520358937537282088", diem: 7 },
    { id: "8_co", ten: "tamco", emojiId: "1520358932319572039", diem: 8 },
    { id: "9_chuon", ten: "chincaulacbo", emojiId: "1520358939336638594", diem: 9 },
    { id: "10_co", ten: "tenofhearts", emojiId: "1520358944931844166", diem: 10 },
    { id: "J_chuon", ten: "jackofclubs1", emojiId: "1520358954805362688", diem: 10 },
    { id: "Q_co", ten: "nuhoangcuatraitim", emojiId: "1520358946517422232", diem: 10 },
    { id: "K_chuon", ten: "vuacuacaccaulacbo", emojiId: "1520358957041057883", diem: 10 },
    { id: "A_bich", ten: "aceofspades", emojiId: "1520358948832673852", diem: 11 }
];

// ============ CLASS CARDGAME ============
class CardGame {
    constructor() { this.deck = []; this.resetDeck(); }
    resetDeck() { this.deck = [...boBai]; this.shuffle(); }
    shuffle() { 
        for (let i = this.deck.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1)); 
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; 
        } 
    }
    drawCard() { if (this.deck.length === 0) this.resetDeck(); return this.deck.pop(); }
    drawHand(numCards) { return Array.from({ length: numCards }, () => this.drawCard()); }
}

// ============ LOGIC BÀI CÀO ============
function calculateScore(cards) { 
    let total = 0; 
    for (let card of cards) total += card.diem; 
    return total % 10; 
}

function getScoreName(score) { 
    const names = { 
        0: '0 Điểm', 1: '1 Điểm', 2: '2 Điểm', 3: '3 Điểm', 4: '4 Điểm', 
        5: '5 Điểm', 6: '6 Điểm', 7: '7 Điểm', 8: '8 Điểm', 9: '9 Điểm (Cào!)' 
    }; 
    return names[score] || `${score} Điểm`; 
}

function checkSpecial(cards) { 
    const ids = cards.map(c => c.id.split('_')[0]); 
    const uniqueIds = new Set(ids); 
    if (uniqueIds.size === 1) return 'SÁP 🔥'; 
    if (ids.every(v => ['J', 'Q', 'K'].includes(v))) return '3 TÂY 👑'; 
    return null; 
}

function getCardDisplay(card) { 
    return `<:${card.ten}:${card.emojiId}>`; 
}

// ============ THÁCH ĐẤU ============
const challenges = new Map();

// ============ TÀI XỈU ============
const taiXiuGames = new Map();

function getDiceEmoji(value) {
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return diceEmojis[value - 1] || '🎲';
}

// ============ FORMAT TIME ============
function formatTime(ms) {
    let seconds = Math.floor(ms / 1000);
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}

// ============ LỆNH .HELP ============
function handleHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📜 DANH SÁCH LỆNH BOT')
        .setDescription('Chào mừng bạn đến với nhà cái đến từ Việt Nam Dưới đây là các lệnh có sẵn:')
        .addFields(
            { name: '💰 `.money`', value: 'Kiểm tra số dư tài khoản của bạn', inline: false },
            { name: '🏆 `.top`', value: 'Xem bảng xếp hạng 10 người giàu nhất server', inline: false },
            { name: '🎁 `.daily`', value: 'Nhận 5,000 VNĐ miễn phí (1 lần mỗi 1h30p)', inline: false },
            { name: '🏦 `.bank @user <số_tiền>`', value: 'Chuyển tiền cho người khác\n**Phí:** 5% số tiền chuyển\n**Ví dụ:** `.bank @user 1000`', inline: false },
            { name: '🔄 `.hoantien`', value: 'Hoàn lại toàn bộ tiền đã thua trong 1p-30p qua', inline: false },
            { name: '🃏 `.cao <số_tiền>`', value: 'Chơi bài cào với Bot (Bot cược ngẫu nhiên!)\n**Ví dụ:** `.cao 500`', inline: false },
            { name: '🔥 `.cao all`', value: 'Chơi bài cào với Bot, cược TOÀN BỘ tiền', inline: false },
            { name: '⚔️ `.cao @user <số_tiền>`', value: 'Thách đấu người khác chơi bài cào', inline: false },
            { name: '⚔️ `.cao @user all`', value: 'Thách đấu ALL-IN, cả 2 cược toàn bộ tiền', inline: false },
            { name: '🎲 `.tx`', value: 'Chơi Tài Xỉu - Chọn TÀI hoặc XỈU\n**Tỷ lệ**: 1 ăn 1 + **Lãi ngẫu nhiên 30-70%**', inline: false }
        )
        .addFields({
            name: '🎯 Luật chơi Bài Cào',
            value: '• Mỗi người nhận 3 lá bài\n• Điểm = tổng điểm 3 lá % 10\n• **Sáp 🔥**: 3 lá giống nhau\n• **3 Tây 👑**: J, Q, K\n• Điểm cao hơn thắng',
            inline: false
        })
        .setFooter({ text: 'Chúc bạn chơi vui vẻ! 🎉' })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .MONEY ============
function handleMoney(message) {
    const userId = message.author.id;
    initUser(userId);
    recordActivity(userId);
    const money = data.users[userId].money;
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`💰 ${message.author.username}`)
        .setDescription(`**${money.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`)
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .TOP (CHỈ SERVER NÀY) ============
function handleTop(message) {
    recordActivity(message.author.id);
    
    const guildMembers = message.guild.members.cache.map(m => m.user.id);
    
    const users = Object.entries(data.users)
        .filter(([userId]) => guildMembers.includes(userId))
        .map(([userId, userData]) => ({
            userId: userId,
            money: userData.money || 0
        }))
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);
    
    if (users.length === 0) {
        return message.reply('❌ Chưa có ai trong server chơi bot!');
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    let description = '';
    users.forEach((user, index) => {
        const medal = medals[index];
        const userObj = client.users.cache.get(user.userId);
        const username = userObj ? userObj.username : `User ${user.userId}`;
        const isCurrentUser = user.userId === message.author.id ? ' ← **BẠN**' : '';
        description += `${medal} **${username}**${isCurrentUser}\n💰 **${user.money.toLocaleString('vi-VN')} VNĐ** ${nuocngot}\n\n`;
    });
    
    const allUsersInGuild = Object.entries(data.users)
        .filter(([userId]) => guildMembers.includes(userId))
        .map(([userId, userData]) => ({ userId, money: userData.money || 0 }))
        .sort((a, b) => b.money - a.money);
    const myRank = allUsersInGuild.findIndex(u => u.userId === message.author.id) + 1;
    
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 BẢNG XẾP HẠNG SERVER')
        .setDescription(description || 'Chưa có dữ liệu')
        .setFooter({ text: myRank > 0 ? `Bạn đang xếp hạng #${myRank} trong server` : 'Hãy chơi để có hạng!' })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .RESET (CHỈ ADMIN) ============
function handleReset(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ **Lệnh này chỉ dành cho Admin!**');
    }
    
    const args = message.content.trim().split(/\s+/);
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
        return message.reply('❌ Vui lòng tag người cần reset!\n**Cách dùng:** `.reset @user`');
    }
    
    initUser(targetUser.id);
    data.users[targetUser.id].money = 10000;
    data.users[targetUser.id].losses = [];
    saveData();
    
    const embed = new EmbedBuilder()
        .setColor('#FF00FF')
        .setTitle('🔄 RESET TIỀN THÀNH CÔNG!')
        .setDescription(
            `✅ Đã reset tiền cho **${targetUser.username}**\n\n` +
            `💰 **Số tiền mới:** **10,000 VNĐ** ${nuocngot}\n` +
            `👮 **Bởi:** <@${ADMIN_ID}>`
        )
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .DAILY ============
function handleDaily(message) {
    const userId = message.author.id;
    initUser(userId);
    recordActivity(userId);
    
    const now = Date.now();
    const cooldown = 5400000;
    const lastDaily = data.users[userId].lastDaily || 0;
    const timeLeft = cooldown - (now - lastDaily);
    
    if (timeLeft > 0) {
        return message.reply(`⏰ Bạn đã nhận daily rồi! Hãy đợi **${formatTime(timeLeft)}** nữa.`);
    }
    
    const reward = 5000;
    data.users[userId].money += reward;
    data.users[userId].lastDaily = now;
    saveData();
    
    const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle('🎁 NHẬN DAILY THÀNH CÔNG!')
        .setDescription(`Nhận **${reward.toLocaleString()} VNĐ** ${nuocngot}\n**Số dư hiện tại:** ${data.users[userId].money.toLocaleString('vi-VN')} VNĐ ${nuocngot}`)
        .setFooter({ text: 'Cooldown: 1 giờ 30 phút' })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .BANK (PHÍ 5% THEO SỐ TIỀN) ============
function handleBank(message) {
    const args = message.content.split(' ');
    args.shift();
    const targetUser = message.mentions.users.first();
    
    recordActivity(message.author.id);
    
    if (!targetUser) return message.reply('❌ Vui lòng tag người nhận! `.bank @user <số_tiền>`');
    if (targetUser.id === message.author.id) return message.reply('❌ Không thể chuyển cho chính mình!');
    if (targetUser.bot) return message.reply('❌ Không thể chuyển cho bot!');
    
    const mentionIndex = args.findIndex(a => a.includes(targetUser.id));
    if (mentionIndex !== -1) args.splice(mentionIndex, 1);
    
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 100) return message.reply('❌ Số tiền chuyển tối thiểu **100 VNĐ**!');
    
    const fee = Math.floor(amount * BANK_FEE_PERCENT);
    const totalNeeded = amount + fee;
    
    if (!deductMoney(message.author.id, totalNeeded)) {
        const currentMoney = getMoney(message.author.id);
        return message.reply(`❌ Không đủ tiền! Cần **${totalNeeded.toLocaleString()} VNĐ** (gồm ${fee.toLocaleString()} VNĐ phí)\nSố dư: **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`);
    }
    
    addMoney(targetUser.id, amount);
    recordActivity(targetUser.id);
    
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🏦 Chuyển Tiền Thành Công!')
        .setDescription(`${message.author} ──💸 **${amount.toLocaleString('vi-VN')} VNĐ** ${nuocngot}──> ${targetUser}`)
        .addFields(
            { name: `💰 ${message.author.username}`, value: `Còn: **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`, inline: true },
            { name: `💰 ${targetUser.username}`, value: `Có: **${getMoney(targetUser.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`, inline: true }
        )
        .setFooter({ text: `Phí giao dịch: ${fee.toLocaleString()} VNĐ (5%)` })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .ADMIN ============
function handleAdmin(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ **Lệnh này chỉ dành cho Admin!**');
    }
    
    recordActivity(ADMIN_ID);
    
    const args = message.content.trim().split(/\s+/);
    let reward = ADMIN_DEFAULT_REWARD;
    
    if (args.length >= 2) {
        const customAmount = parseInt(args[1]);
        if (!isNaN(customAmount) && customAmount > 0) {
            reward = customAmount;
        } else {
            return message.reply('❌ Số tiền không hợp lệ!');
        }
    }
    
    addMoney(ADMIN_ID, reward);
    const currentMoney = getMoney(ADMIN_ID);
    
    const embed = new EmbedBuilder()
        .setColor('#FF00FF')
        .setTitle('👑 ADMIN REWARD')
        .setDescription(`✅ Nhận thành công **${reward.toLocaleString('vi-VN')} VNĐ** ${nuocngot}\n💰 **Số dư:** **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`)
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .BL (BLACKLIST) ============
function handleBlacklist(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ **Lệnh này chỉ dành cho Admin!**');
    }
    
    const args = message.content.trim().split(/\s+/);
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
        return message.reply('❌ Vui lòng tag người cần blacklist!\n**Cách dùng:**\n• `.bl @user` - Blacklist vĩnh viễn\n• `.bl @user <số_phút>` - Blacklist theo phút (tối đa 1440 phút = 24h)');
    }
    
    if (targetUser.id === ADMIN_ID) {
        return message.reply('❌ Không thể blacklist Admin!');
    }
    
    let duration = 'permanent';
    let durationText = 'VĨNH VIỄN';
    
    if (args.length >= 3) {
        const minutes = parseInt(args[2]);
        if (isNaN(minutes) || minutes <= 0) {
            return message.reply('❌ Thời gian không hợp lệ!');
        }
        if (minutes > 1440) {
            return message.reply('❌ Thời gian tối đa là 1440 phút (24 giờ)!');
        }
        duration = minutes * 60 * 1000;
        durationText = `${minutes} phút`;
    }
    
    setBlacklist(targetUser.id, duration, ADMIN_ID, 'Bị admin blacklist');
    
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚫 BLACKLIST THÀNH CÔNG!')
        .setDescription(
            `✅ Đã blacklist **${targetUser.username}**\n\n` +
            `⏰ **Thời gian:** ${durationText}\n` +
            `👮 **Bởi:** <@${ADMIN_ID}>\n` +
            `📝 **Lý do:** Vi phạm quy định`
        )
        .setFooter({ text: 'Dùng .unbl @user để gỡ blacklist' })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .UNBL (UNBLACKLIST) ============
function handleUnblacklist(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ **Lệnh này chỉ dành cho Admin!**');
    }
    
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
        return message.reply('❌ Vui lòng tag người cần unblacklist!\n**Cách dùng:** `.unbl @user`');
    }
    
    const blInfo = isBlacklisted(targetUser.id);
    if (!blInfo.isBl) {
        return message.reply(`❌ **${targetUser.username}** không bị blacklist!`);
    }
    
    removeBlacklist(targetUser.id);
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ UNBLACKLIST THÀNH CÔNG!')
        .setDescription(
            `✅ Đã gỡ blacklist cho **${targetUser.username}**\n\n` +
            `👮 **Bởi:** <@${ADMIN_ID}>\n` +
            `🎉 Người này có thể sử dụng bot trở lại!`
        )
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .HOANTIEN ============
function handleHoanTien(message) {
    const userId = message.author.id;
    initUser(userId);
    
    const now = Date.now();
    const MIN_TIME = 1 * 60 * 1000;
    const MAX_TIME = 30 * 60 * 1000;
    
    const losses = data.users[userId].losses || [];
    
    const eligibleLosses = losses.filter(loss => {
        const timeAgo = now - loss.time;
        return timeAgo >= MIN_TIME && timeAgo <= MAX_TIME;
    });
    
    if (eligibleLosses.length === 0) {
        const recentLosses = losses.filter(loss => now - loss.time < MIN_TIME);
        const oldLosses = losses.filter(loss => now - loss.time > MAX_TIME);
        
        let hint = '';
        if (recentLosses.length > 0) {
            hint = `\n💡 Bạn có **${recentLosses.length}** lần thua trong vòng 1 phút qua. Hãy đợi thêm!`;
        } else if (oldLosses.length > 0) {
            hint = `\n💡 Các lần thua đã quá 30 phút hoặc chưa đủ 1 phút.`;
        } else {
            hint = '\n💡 Bạn chưa có lần thua nào trong khoảng thời gian hợp lệ.';
        }
        
        return message.reply(`❌ **Không có tiền để hoàn!**${hint}`);
    }
    
    const totalRefund = eligibleLosses.reduce((sum, loss) => sum + loss.amount, 0);
    addMoney(userId, totalRefund);
    
    data.users[userId].losses = losses.filter(loss => {
        const timeAgo = now - loss.time;
        return !(timeAgo >= MIN_TIME && timeAgo <= MAX_TIME);
    });
    saveData();
    
    const currentMoney = getMoney(userId);
    
    const gameStats = {};
    eligibleLosses.forEach(loss => {
        if (!gameStats[loss.game]) gameStats[loss.game] = { count: 0, amount: 0 };
        gameStats[loss.game].count++;
        gameStats[loss.game].amount += loss.amount;
    });
    
    let statsText = '';
    for (const [game, stat] of Object.entries(gameStats)) {
        statsText += `• **${game}**: ${stat.count} lần - ${stat.amount.toLocaleString()} VNĐ\n`;
    }
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 HOÀN TIỀN THÀNH CÔNG!')
        .setDescription(
            `✅ **Đã hoàn lại toàn bộ tiền thua!**\n\n` +
            `📊 **Chi tiết:**\n${statsText}\n` +
            `💰 **Tổng hoàn:** **${totalRefund.toLocaleString('vi-VN')} VNĐ** ${nuocngot}\n` +
            `🏦 **Số dư:** **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`
        )
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ HÀM PARSE BET ============
function parseBet(betStr, userId) {
    if (betStr.toLowerCase() === 'all') {
        return { isAll: true, amount: getMoney(userId) };
    }
    const amount = parseInt(betStr);
    if (isNaN(amount)) return { isAll: false, amount: NaN };
    return { isAll: false, amount: amount };
}

// ============ LỆNH .CAO (BOT CƯỢC NGẪU NHIÊN) - ĐÃ FIX ============
function handlePlayWithBot(message) {
    const args = message.content.split(' ');
    const betStr = args[1];
    
    recordActivity(message.author.id);
    
    if (!betStr) return message.reply('❌ Vui lòng nhập số tiền cược hoặc `all`!');
    
    const betInfo = parseBet(betStr, message.author.id);
    const playerBet = betInfo.amount;
    const isAll = betInfo.isAll;
    
    if (isNaN(playerBet)) return message.reply('❌ Số tiền không hợp lệ!');
    if (!isAll && playerBet < 100) return message.reply('❌ Cược tối thiểu **100 VNĐ**!');
    if (playerBet <= 0) return message.reply('❌ Bạn không có tiền để cược!');
    
    if (getMoney(message.author.id) < playerBet) {
        return message.reply(`❌ Không đủ tiền! Số dư: **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`);
    }
    
    // ✅ BOT CƯỢC NGẪU NHIÊN: từ playerBet đến playerBet * 3
    const botBet = Math.floor(playerBet * (1 + Math.random() * 2));
    
    // ✅ TỔNG POOL = Tiền người chơi + Tiền bot
    const totalPool = playerBet + botBet;
    
    deductMoney(message.author.id, playerBet);
    
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
    
    if (playerSpecial && !botSpecial) { 
        result = 'THẮNG (Sáp!)'; 
        color = '#FFD700'; 
        winAmount = totalPool;
    } else if (!playerSpecial && botSpecial) { 
        result = 'THUA'; 
        color = '#FF0000'; 
        winAmount = 0; 
    } else if (playerSpecial && botSpecial) {
        if (playerSpecial === botSpecial) { 
            result = 'HÒA'; 
            color = '#FFFF00'; 
            winAmount = playerBet;
        } else { 
            if (playerScore > botScore) { 
                result = 'THẮNG'; 
                color = '#FFD700'; 
                winAmount = totalPool;
            } else { 
                result = 'THUA'; 
                color = '#FF0000'; 
                winAmount = 0; 
            } 
        }
    } else {
        if (playerScore > botScore) { 
            result = 'THẮNG'; 
            color = '#FFD700'; 
            winAmount = totalPool;
        } else if (playerScore < botScore) { 
            result = 'THUA'; 
            color = '#FF0000'; 
            winAmount = 0; 
        } else { 
            result = 'HÒA'; 
            color = '#FFFF00'; 
            winAmount = playerBet;
        }
    }
    
    if (winAmount > 0) {
        addMoney(message.author.id, winAmount);
    } else if (result === 'THUA') {
        recordLoss(message.author.id, playerBet, 'Bài Cào (vs Bot)');
    }
    
    // ✅ HIỂN THỊ KẾT QUẢ ĐƠN GIẢN (không có "ăn cả pool", không có "tổng pool")
    let displayAmount = '';
    if (winAmount === totalPool) {
        displayAmount = `+ **${winAmount.toLocaleString()} VNĐ**`;
    } else if (winAmount === playerBet) {
        displayAmount = `Hoàn **${playerBet.toLocaleString()} VNĐ**`;
    } else {
        displayAmount = `Mất **${playerBet.toLocaleString()} VNĐ**`;
    }
    
    const playerBetLabel = isAll ? `🔥 ALL-IN: **${playerBet.toLocaleString()} VNĐ**` : `Bạn cược: **${playerBet.toLocaleString()} VNĐ**`;
    const botBetLabel = `🤖 Bot cược: **${botBet.toLocaleString()} VNĐ**`;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🃏 Bài Cào - ${result}!`)
        .setDescription(`${playerBetLabel}\n${botBetLabel}`)
        .addFields(
            { name: `👤 ${message.author.username}`, value: `${playerDisplay}\n${playerSpecial ? `**${playerSpecial}** + ` : ''}${getScoreName(playerScore)}`, inline: true },
            { name: `🤖 Bot`, value: `${botDisplay}\n${botSpecial ? `**${botSpecial}** + ` : ''}${getScoreName(botScore)}`, inline: true },
            { name: '💰 Kết quả', value: displayAmount, inline: false }
        )
        .setFooter({ text: `Số dư: ${getMoney(message.author.id).toLocaleString()} VNĐ` });
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .CAO @NGƯỜI (THÁCH ĐẤU) ============
function handleChallenge(message) {
    const args = message.content.split(' ');
    args.shift();
    const targetUser = message.mentions.users.first();
    
    recordActivity(message.author.id);
    
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
        return message.reply('❌ Tag người thật để thách đấu!');
    }
    
    const betStr = args[args.length - 1];
    if (!betStr) return message.reply('❌ Vui lòng nhập số tiền cược hoặc `all`!');
    
    const myBetInfo = parseBet(betStr, message.author.id);
    const myBet = myBetInfo.amount;
    const myIsAll = myBetInfo.isAll;
    
    if (isNaN(myBet)) return message.reply('❌ Số tiền không hợp lệ!');
    if (!myIsAll && myBet < 100) return message.reply('❌ Cược tối thiểu 100 VNĐ!');
    if (myBet <= 0) return message.reply('❌ Bạn không có tiền để cược!');
    
    const reverseKey = targetUser.id + '_' + message.author.id;
    
    if (challenges.has(reverseKey)) {
        const existingChallenge = challenges.get(reverseKey);
        challenges.delete(reverseKey);
        
        let p1Bet = existingChallenge.amount;
        let p1IsAll = existingChallenge.isAll;
        let p2Bet = myBet;
        let p2IsAll = myIsAll;
        
        if (p2IsAll) {
            p2Bet = getMoney(message.author.id);
            if (p2Bet <= 0) {
                return message.reply(`❌ Bạn không còn tiền để cược ALL!`);
            }
        }
        
        if (!deductMoney(message.author.id, p2Bet)) {
            return message.reply(`❌ Bạn không đủ tiền! Cần **${p2Bet.toLocaleString()} VNĐ**`);
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
        
        if (p1Special && !p2Special) { 
            winner = targetUser; 
            color = '#FFD700'; 
            resultText = targetUser.username + ' THẮNG (Sáp!)'; 
        } else if (!p1Special && p2Special) { 
            winner = message.author; 
            color = '#FFD700'; 
            resultText = message.author.username + ' THẮNG (Sáp!)'; 
        } else if (p1Special && p2Special) {
            if (p1Special === p2Special) {
                if (p1Score > p2Score) { 
                    winner = targetUser; 
                    color = '#FFD700'; 
                    resultText = targetUser.username + ' THẮNG!'; 
                } else if (p2Score > p1Score) { 
                    winner = message.author; 
                    color = '#FFD700'; 
                    resultText = message.author.username + ' THẮNG!'; 
                } else { 
                    color = '#FFFF00'; 
                    resultText = 'HÒA!'; 
                }
            } else {
                if (p1Special === 'SÁP 🔥') { 
                    winner = targetUser; 
                    color = '#FFD700'; 
                    resultText = targetUser.username + ' THẮNG (Sáp)!'; 
                } else { 
                    winner = message.author; 
                    color = '#FFD700'; 
                    resultText = message.author.username + ' THẮNG (Sáp)!'; 
                }
            }
        } else {
            if (p1Score > p2Score) { 
                winner = targetUser; 
                color = '#FFD700'; 
                resultText = targetUser.username + ' THẮNG!'; 
            } else if (p2Score > p1Score) { 
                winner = message.author; 
                color = '#FFD700'; 
                resultText = message.author.username + ' THẮNG!'; 
            } else { 
                color = '#FFFF00'; 
                resultText = 'HÒA!'; 
            }
        }
        
        if (winner) { 
            addMoney(winner.id, totalPool); 
            resultText += `\n💰 Nhận ${totalPool.toLocaleString()} VNĐ`;
            const loser = winner.id === targetUser.id ? message.author : targetUser;
            const loserBet = winner.id === targetUser.id ? p2Bet : p1Bet;
            recordLoss(loser.id, loserBet, 'Thách đấu Bài Cào');
        } else { 
            addMoney(targetUser.id, p1Bet); 
            addMoney(message.author.id, p2Bet); 
            resultText += '\n💰 Hoàn cược!'; 
        }
        
        const p1Label = p1IsAll ? `🔥 ALL-IN: ${p1Bet.toLocaleString()} VNĐ` : `${targetUser.username} cược: ${p1Bet.toLocaleString()} VNĐ`;
        const p2Label = p2IsAll ? `🔥 ALL-IN: ${p2Bet.toLocaleString()} VNĐ` : `${message.author.username} cược: ${p2Bet.toLocaleString()} VNĐ`;
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⚔️ KẾT QUẢ THÁCH ĐẤU!')
            .setDescription(`${p1Label}\n${p2Label}\nTổng: ${totalPool.toLocaleString()} VNĐ`)
            .addFields(
                { name: '👤 ' + targetUser.username, value: p1Display + '\n' + (p1Special ? '**' + p1Special + '** + ' : '') + getScoreName(p1Score), inline: true },
                { name: '👤 ' + message.author.username, value: p2Display + '\n' + (p2Special ? '**' + p2Special + '** + ' : '') + getScoreName(p2Score), inline: true },
                { name: '🏆 Kết quả', value: resultText, inline: false }
            )
            .setTimestamp();
        
        return message.reply({ content: targetUser.toString(), embeds: [embed] });
    } else {
        if (!deductMoney(message.author.id, myBet)) {
            return message.reply(`❌ Không đủ tiền để thách đấu! Số dư: **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`);
        }
        
        const challengeKey = message.author.id + '_' + targetUser.id;
        challenges.set(challengeKey, { 
            challenger: message.author.id, 
            target: targetUser.id, 
            amount: myBet, 
            isAll: myIsAll,
            time: Date.now(),
            channel: message.channel.id 
        });
        
        setTimeout(() => { 
            if (challenges.has(challengeKey)) {
                const challenge = challenges.get(challengeKey);
                challenges.delete(challengeKey);
                addMoney(challenge.challenger, challenge.amount);
                message.channel.send(`⏰ <@${challenge.challenger}> thách đấu <@${challenge.target}> nhưng hết hạn!\n💰 Đã hoàn **${challenge.amount.toLocaleString()} VNĐ** cho <@${challenge.challenger}>`);
            }
        }, 60000);
        
        const betLabel = myIsAll 
            ? `🔥 **ALL-IN** (toàn bộ tiền: ${myBet.toLocaleString()} VNĐ)` 
            : `${myBet.toLocaleString()} VNĐ`;
        
        return message.reply('⚔️ **THÁCH ĐẤU BÀI CÀO!**\n\n' + message.author.toString() + ' muốn đấu với ' + targetUser.toString() + `\n💰 ` + message.author.username + ' cược: ' + betLabel + `\n👉 ` + targetUser.toString() + ' gõ: `.cao @' + message.author.username + ' <tiền>` hoặc `.cao @' + message.author.username + ' all` để chấp nhận!\n⏰ Hết hạn sau 60 giây!');
    }
}

// ============ LỆNH .TX (TÀI XỈU) ============
function handleTaiXiu(message) {
    if (taiXiuGames.has(message.channel.id)) {
        return message.reply('❌ Đang có ván Tài Xỉu trong channel này!');
    }
    
    recordActivity(message.author.id);
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('tx_tai')
                .setLabel('📈 TÀI')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('tx_xiu')
                .setLabel('📉 XỈU')
                .setStyle(ButtonStyle.Primary)
        );
    
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎲 TÀI XỈU - CHỌN CỬA')
        .setDescription(
            '**Hãy chọn cửa bạn muốn!**\n\n' +
            '📈 **TÀI**: 11-17 điểm\n' +
            '📉 **XỈU**: 4-10 điểm\n' +
            '⚠️ **Bộ 3**: Nhà cái thắng\n' +
            '💰 **Tỷ lệ**: 1 ăn 1 + **Lãi 30-70%**\n\n' +
            '⏱️ Sau khi chọn, bạn có **45 giây** để nhập tiền!'
        )
        .setFooter({ text: 'Nhấn nút bên dưới để chọn!' })
        .setTimestamp();
    
    message.reply({ embeds: [embed], components: [row] }).then((sentMessage) => {
        
        const collector = sentMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: (interaction) => true
        });
        
        let selectedUser = null;
        let selectedChoice = null;
        
        collector.on('collect', async (interaction) => {
            if (selectedUser) {
                await interaction.reply({ content: '❌ Đã có người chọn rồi!', ephemeral: true });
                return;
            }
            
            selectedUser = interaction.user;
            selectedChoice = interaction.customId === 'tx_tai' ? 'tai' : 'xiu';
            recordActivity(selectedUser.id);
            
            const modal = new ModalBuilder()
                .setCustomId(`tx_bet_${selectedChoice}_${selectedUser.id}`)
                .setTitle('💰 NHẬP TIỀN CƯỢC');
            
            const betInput = new TextInputBuilder()
                .setCustomId('bet_amount')
                .setLabel('Số tiền bạn muốn cược (VNĐ)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 10000')
                .setMinLength(1)
                .setMaxLength(15)
                .setRequired(true);
            
            const modalRow = new ActionRowBuilder().addComponents(betInput);
            modal.addComponents(modalRow);
            
            await interaction.showModal(modal);
        });
        
        collector.on('end', (collected, reason) => {
            if (!selectedUser) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('⏰ HẾT THỜI GIAN')
                    .setDescription('Không có ai chọn!\n\nVán chơi đã bị hủy.')
                    .setTimestamp();
                
                sentMessage.edit({ embeds: [timeoutEmbed], components: [] });
                taiXiuGames.delete(message.channel.id);
            }
        });
    });
}

async function startCountdown(channel, sentMessage, user, choice, bet) {
    const betLabel = `Cược: **${bet.toLocaleString()} VNĐ**`;
    const choiceText = choice === 'tai' ? '📈 TÀI' : '📉 XỈU';
    
    let timeLeft = 45;
    
    const countdownEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎲 TÀI XỈU - ĐANG CHỜ KẾT QUẢ')
        .setDescription(
            `${betLabel}\n👤 **Người chơi:** ${user}\n✅ **Đã chọn:** ${choiceText}\n\n⏳ **Đang đếm ngược...**\n⏰ Thời gian: **45 giây**`
        )
        .setFooter({ text: 'Đợi bot tung xúc xắc...' })
        .setTimestamp();
    
    await sentMessage.edit({ embeds: [countdownEmbed], components: [] });
    
    const countdownInterval = setInterval(async () => {
        timeLeft--;
        
        if (timeLeft > 0) {
            const updateEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎲 TÀI XỈU - ĐANG CHỜ KẾT QUẢ')
                .setDescription(
                    `${betLabel}\n👤 **Người chơi:** ${user}\n✅ **Đã chọn:** ${choiceText}\n\n⏳ **Còn lại:** ${timeLeft} giây`
                )
                .setFooter({ text: 'Đợi bot tung xúc xắc...' })
                .setTimestamp();
            
            try {
                await sentMessage.edit({ embeds: [updateEmbed] });
            } catch (err) {
                console.error('Lỗi update countdown:', err.message);
            }
        } else {
            clearInterval(countdownInterval);
            await showResult(channel, sentMessage, user, choice, bet);
        }
    }, 1000);
}

async function showResult(channel, sentMessage, user, choice, bet) {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;
    
    const isTriple = (dice1 === dice2 && dice2 === dice3);
    let result = '';
    let userWin = false;
    
    if (isTriple) {
        result = 'BỘ 3 🎰';
        userWin = false;
    } else if (total >= 4 && total <= 10) {
        result = 'XỈU';
        userWin = (choice === 'xiu');
    } else {
        result = 'TÀI';
        userWin = (choice === 'tai');
    }
    
    let winAmount = 0;
    let interestAmount = 0;
    
    if (userWin) {
        winAmount = bet;
        const interestRate = 0.30 + Math.random() * 0.40;
        interestAmount = Math.floor(bet * interestRate);
        const totalWin = winAmount + interestAmount;
        addMoney(user.id, totalWin);
    } else {
        recordLoss(user.id, bet, 'Tài Xỉu');
    }
    
    const currentMoney = getMoney(user.id);
    const d1 = getDiceEmoji(dice1);
    const d2 = getDiceEmoji(dice2);
    const d3 = getDiceEmoji(dice3);
    
    const choiceText = choice === 'tai' ? '📈 TÀI' : '📉 XỈU';
    const resultEmoji = userWin ? '🎉' : '😢';
    const resultLabel = userWin ? 'BẠN THẮNG!' : 'BẠN THUA!';
    
    let moneyText = '';
    if (userWin) {
        const interestPercent = Math.round((interestAmount / bet) * 100);
        moneyText = `+ **${winAmount.toLocaleString()} VNĐ** (gốc)\n💵 **Lãi ${interestPercent}%:** + **${interestAmount.toLocaleString()} VNĐ**\n💰 **Tổng nhận:** **${(winAmount + interestAmount).toLocaleString()} VNĐ**`;
    } else {
        moneyText = `- **${bet.toLocaleString()} VNĐ**`;
    }
    
    const resultEmbed = new EmbedBuilder()
        .setColor(userWin ? '#00FF00' : '#FF0000')
        .setTitle(`🎲 TÀI XỈU - ${resultLabel}`)
        .setDescription(
            `${resultEmoji} **Bạn chọn:** ${choiceText}\n\n` +
            `🎲 **Kết quả:**\n${d1} ${d2} ${d3}\n\n` +
            `📊 **Tổng điểm:** ${total} → **${result}**\n\n` +
            `💰 **Tiền cược:** ${bet.toLocaleString()} VNĐ\n` +
            `${userWin ? '💵' : '💸'} **Kết quả:**\n${moneyText}\n\n` +
            `🏦 **Số dư:** **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`
        )
        .setFooter({ text: isTriple ? '⚠️ Bộ 3 - Nhà cái thắng!' : 'Tài Xỉu - 1:1 + Lãi 30-70%' })
        .setTimestamp();
    
    await sentMessage.edit({ embeds: [resultEmbed] });
    taiXiuGames.delete(channel.id);
}

// ============ SỰ KIỆN BOT ============
client.once('clientReady', () => {
    console.log(`✅ Đã đăng nhập: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.')) return;
    
    const content = message.content.trim().toLowerCase();
    const userId = message.author.id;
    
    const blCheck = isBlacklisted(userId);
    if (blCheck.isBl) {
        let timeInfo = '';
        if (blCheck.permanent) {
            timeInfo = '**VĨNH VIỄN**';
        } else {
            const remaining = blCheck.until - Date.now();
            timeInfo = `**${formatTime(remaining)}** nữa`;
        }
        return message.reply(`🚫 **Bạn đang bị BLACKLIST!**\n⏰ Thời gian còn lại: ${timeInfo}\n👮 Liên hệ Admin để được gỡ.`);
    }
    
    const spamCheck = checkSpam(userId, content);
    if (spamCheck.isSpam) {
        const durationText = formatTime(spamCheck.duration);
        return message.reply(`🚫 **PHÁT HIỆN SPAM!**\n\n⚠️ Bạn đã spam lệnh bot quá nhiều!\n⏰ **Đã bị blacklist tự động: ${durationText}**\n\n💡 Hãy chơi chậm lại để tránh bị phạt!`);
    }
    
    if (content === '.help') return handleHelp(message);
    if (content === '.money') return handleMoney(message);
    if (content === '.top') return handleTop(message);
    if (content === '.daily') return handleDaily(message);
    if (content === '.reset') return handleReset(message);
    if (content.startsWith('.admin')) return handleAdmin(message);
    if (content.startsWith('.bl')) return handleBlacklist(message);
    if (content.startsWith('.unbl')) return handleUnblacklist(message);
    if (content === '.hoantien') return handleHoanTien(message);
    if (content.startsWith('.bank')) return handleBank(message);
    if (content === '.tx') return handleTaiXiu(message);
    if (content.startsWith('.cao') && !message.mentions.users.size) return handlePlayWithBot(message);
    if (content.startsWith('.cao') && message.mentions.users.size) return handleChallenge(message);
});

// ✅ XỬ LÝ MODAL SUBMIT
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    if (!interaction.customId.startsWith('tx_bet_')) return;
    
    const blCheck = isBlacklisted(interaction.user.id);
    if (blCheck.isBl) {
        return interaction.reply({ content: '🚫 Bạn đang bị BLACKLIST!', ephemeral: true });
    }
    
    const parts = interaction.customId.split('_');
    const choice = parts[2];
    const userId = parts[3];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Modal này không dành cho bạn!', ephemeral: true });
    }
    
    const betStr = interaction.fields.getTextInputValue('bet_amount');
    const bet = parseInt(betStr.replace(/[^0-9]/g, ''));
    
    if (isNaN(bet) || bet <= 0) {
        return interaction.reply({ content: '❌ Số tiền không hợp lệ!', ephemeral: true });
    }
    
    if (bet < 100) {
        return interaction.reply({ content: '❌ Cược tối thiểu **100 VNĐ**!', ephemeral: true });
    }
    
    if (getMoney(userId) < bet) {
        return interaction.reply({ content: `❌ Không đủ tiền! Số dư: **${getMoney(userId).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`, ephemeral: true });
    }
    
    await interaction.deferUpdate();
    
    deductMoney(userId, bet);
    
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 10 });
    const gameMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('CHỌN CỬA'));
    
    if (!gameMessage) {
        return;
    }
    
    await startCountdown(channel, gameMessage, interaction.user, choice, bet);
});

// ========== XỬ LÝ LỖI GLOBAL ==========
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// ========== DEBUG TOKEN ==========
console.log('🔍 Đang kiểm tra token...');
if (!TOKEN || TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ LỖI: Token chưa được set!');
    process.exit(1);
}

if (TOKEN.length < 50) {
    console.error('❌ LỖI: Token quá ngắn!');
    process.exit(1);
}

console.log(`✅ Token hợp lệ! Độ dài: ${TOKEN.length} ký tự`);
console.log('🚀 Đang đăng nhập bot...');

client.login(TOKEN).catch(err => {
    console.error('❌ Lỗi đăng nhập:', err);
});
