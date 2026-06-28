const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');

// ============ WEB SERVER (GIỮ CHO BOT KHÔNG BỊ RENDER NGỦ) ============
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
const ADMIN_ID = '1514690131829719090';
const ADMIN_REWARD = 500000;

// ============ ICON TIỀN ============
const nuocngot = "<:nuocngot:1520349264700506293>";

// ============ LOAD DỮ LIỆU ============
let data = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!data.users) data.users = {};
        if (!data.dailyCooldown) data.dailyCooldown = {};
        console.log(`✅ Đã tải dữ liệu ${Object.keys(data.users).length} người dùng!`);
    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu:', error.message);
        data = { users: {}, dailyCooldown: {} };
    }
} else {
    data = { users: {}, dailyCooldown: {} };
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
            lastDaily: 0
        };
        saveData();
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
            { name: '🎁 `.daily`', value: 'Nhận 5,000 VNĐ miễn phí (1 lần mỗi 1h30p)', inline: false },
            { name: '🏦 `.bank @user <số_tiền>`', value: 'Chuyển tiền cho người khác (tối thiểu 100 VNĐ)\n**Ví dụ:** `.bank @user 1000`', inline: false },
            { name: '🃏 `.cao <số_tiền>`', value: 'Chơi bài cào với Bot (cược tối thiểu 100 VNĐ)\n**Ví dụ:** `.cao 500`', inline: false },
            { name: '🔥 `.cao all`', value: 'Chơi bài cào với Bot, cược TOÀN BỘ tiền hiện có\n**Ví dụ:** `.cao all`', inline: false },
            { name: '⚔️ `.cao @user <số_tiền>`', value: 'Thách đấu người khác chơi bài cào\n**Ví dụ:** `.cao @user 1000`\n⏰ Đối thủ có 60 giây để chấp nhận', inline: false },
            { name: '⚔️ `.cao @user all`', value: 'Thách đấu ALL-IN, cả 2 cược toàn bộ tiền\n**Ví dụ:** `.cao @user all`', inline: false }
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

// ============ LỆNH .MONEY ============
function handleMoney(message) {
    const userId = message.author.id;
    initUser(userId);
    const money = data.users[userId].money;
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`💰 ${message.author.username}`)
        .setDescription(`**${money.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`)
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .DAILY ============
function handleDaily(message) {
    const userId = message.author.id;
    initUser(userId);
    
    const now = Date.now();
    const cooldown = 5400000; // 1h30p
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

// ============ LỆNH .BANK ============
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
        return message.reply(`❌ Không đủ tiền! Số dư: **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`);
    }
    
    addMoney(targetUser.id, amount);
    
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🏦 Chuyển Tiền Thành Công!')
        .setDescription(`${message.author} ──💸 **${amount.toLocaleString('vi-VN')} VNĐ** ${nuocngot}──> ${targetUser}`)
        .addFields(
            { name: `💰 ${message.author.username}`, value: `Còn: **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`, inline: true },
            { name: `💰 ${targetUser.username}`, value: `Có: **${getMoney(targetUser.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`, inline: true }
        )
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .ADMIN (CHỈ ADMIN) ============
function handleAdmin(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ **Lệnh này chỉ dành cho Admin!**\n🔒 Bạn không có quyền sử dụng lệnh này.');
    }
    
    addMoney(ADMIN_ID, ADMIN_REWARD);
    const currentMoney = getMoney(ADMIN_ID);
    
    const embed = new EmbedBuilder()
        .setColor('#FF00FF')
        .setTitle('👑 ADMIN REWARD')
        .setDescription(`✅ Nhận thành công **${ADMIN_REWARD.toLocaleString('vi-VN')} VNĐ** ${nuocngot}\n💰 **Số dư hiện tại:** **${currentMoney.toLocaleString('vi-VN')} VNĐ** ${nuocngot}`)
        .setFooter({ text: 'Chỉ Admin mới có quyền này!' })
        .setTimestamp();
    
    return message.reply({ embeds: [embed] });
}

// ============ HÀM PARSE BET (HỖ TRỢ "ALL") ============
function parseBet(betStr, userId) {
    if (betStr.toLowerCase() === 'all') {
        return { isAll: true, amount: getMoney(userId) };
    }
    const amount = parseInt(betStr);
    if (isNaN(amount)) return { isAll: false, amount: NaN };
    return { isAll: false, amount: amount };
}

// ============ LỆNH .CAO (CHƠI VỚI BOT) ============
function handlePlayWithBot(message) {
    const args = message.content.split(' ');
    const betStr = args[1];
    
    if (!betStr) return message.reply('❌ Vui lòng nhập số tiền cược hoặc `all`!\n**Ví dụ:** `.cao 500` hoặc `.cao all`');
    
    const betInfo = parseBet(betStr, message.author.id);
    const bet = betInfo.amount;
    const isAll = betInfo.isAll;
    
    if (isNaN(bet)) return message.reply('❌ Số tiền không hợp lệ! Vui lòng nhập số hoặc `all`.');
    if (!isAll && bet < 100) return message.reply('❌ Cược tối thiểu **100 VNĐ**!');
    if (bet <= 0) return message.reply('❌ Bạn không có tiền để cược!');
    
    if (getMoney(message.author.id) < bet) {
        return message.reply(`❌ Không đủ tiền! Số dư: **${getMoney(message.author.id).toLocaleString('vi-VN')} VNĐ** ${nuocngot}`);
    }
    
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
    
    if (playerSpecial && !botSpecial) { 
        result = 'THẮNG (Sáp!)'; 
        color = '#FFD700'; 
        winAmount = bet * 2; 
    } else if (!playerSpecial && botSpecial) { 
        result = 'THUA'; 
        color = '#FF0000'; 
        winAmount = 0; 
    } else if (playerSpecial && botSpecial) {
        if (playerSpecial === botSpecial) { 
            result = 'HÒA'; 
            color = '#FFFF00'; 
            winAmount = bet; 
        } else { 
            if (playerScore > botScore) { 
                result = 'THẮNG'; 
                color = '#FFD700'; 
                winAmount = bet * 2; 
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
            winAmount = bet * 2; 
        } else if (playerScore < botScore) { 
            result = 'THUA'; 
            color = '#FF0000'; 
            winAmount = 0; 
        } else { 
            result = 'HÒA'; 
            color = '#FFFF00'; 
            winAmount = bet; 
        }
    }
    
    if (winAmount > 0) addMoney(message.author.id, winAmount);
    
    const displayAmount = winAmount > bet 
        ? `+ **${winAmount.toLocaleString()} VNĐ**` 
        : winAmount === bet 
        ? `Hoàn **${bet.toLocaleString()} VNĐ**` 
        : `Mất **${bet.toLocaleString()} VNĐ**`;
    
    const betLabel = isAll ? `🔥 ALL-IN: **${bet.toLocaleString()} VNĐ**` : `Cược: **${bet.toLocaleString()} VNĐ**`;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🃏 Bài Cào - ${result}!`)
        .setDescription(betLabel)
        .addFields(
            { name: `👤 ${message.author.username}`, value: `${playerDisplay}\n${playerSpecial ? `**${playerSpecial}** + ` : ''}${getScoreName(playerScore)}`, inline: true },
            { name: `🤖 Bot`, value: `${botDisplay}\n${botSpecial ? `**${botSpecial}** + ` : ''}${getScoreName(botScore)}`, inline: true },
            { name: '💰 Kết quả', value: displayAmount, inline: false }
        )
        .setFooter({ text: `Số dư: ${getMoney(message.author.id).toLocaleString()} VNĐ` });
    
    return message.reply({ embeds: [embed] });
}

// ============ LỆNH .CAO @NGƯỜI (THÁCH ĐẤU) - ĐÃ FIX ============
function handleChallenge(message) {
    const args = message.content.split(' ');
    args.shift();
    const targetUser = message.mentions.users.first();
    
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
        return message.reply('❌ Tag người thật để thách đấu!');
    }
    
    const betStr = args[args.length - 1];
    if (!betStr) return message.reply('❌ Vui lòng nhập số tiền cược hoặc `all`!');
    
    const myBetInfo = parseBet(betStr, message.author.id);
    const myBet = myBetInfo.amount;
    const myIsAll = myBetInfo.isAll;
    
    if (isNaN(myBet)) return message.reply('❌ Số tiền không hợp lệ! Vui lòng nhập số hoặc `all`.');
    if (!myIsAll && myBet < 100) return message.reply('❌ Cược tối thiểu 100 VNĐ!');
    if (myBet <= 0) return message.reply('❌ Bạn không có tiền để cược!');
    
    const reverseKey = targetUser.id + '_' + message.author.id;
    
    if (challenges.has(reverseKey)) {
        // ✅ Chấp nhận thách đấu
        const existingChallenge = challenges.get(reverseKey);
        challenges.delete(reverseKey);
        
        // ✅ Dùng số tiền đã lưu sẵn khi tạo thách đấu (người 1)
        let p1Bet = existingChallenge.amount;
        let p1IsAll = existingChallenge.isAll;
        
        // ✅ Tính số tiền của người chấp nhận (người 2)
        let p2Bet = myBet;
        let p2IsAll = myIsAll;
        
        // ✅ Nếu người chấp nhận cược ALL, lấy toàn bộ tiền hiện có
        if (p2IsAll) {
            p2Bet = getMoney(message.author.id);
            if (p2Bet <= 0) {
                return message.reply(`❌ Bạn không còn tiền để cược ALL!`);
            }
        }
        
        // ✅ Kiểm tra và trừ tiền người chấp nhận
        if (!deductMoney(message.author.id, p2Bet)) {
            return message.reply(`❌ Bạn không đủ tiền! Cần **${p2Bet.toLocaleString()} VNĐ**`);
        }
        
        // ✅ Người tạo thách đấu đã trừ tiền rồi, không cần kiểm tra lại
        
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
        // Tạo thách đấu mới
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

// ============ SỰ KIỆN BOT ============
client.once('clientReady', () => {
    console.log(`✅ Đã đăng nhập: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.')) return;
    
    const content = message.content.trim().toLowerCase();
    
    if (content === '.help') return handleHelp(message);
    if (content === '.money') return handleMoney(message);
    if (content === '.daily') return handleDaily(message);
    if (content === '.admin') return handleAdmin(message);
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

// ========== DEBUG TOKEN ==========
console.log('🔍 Đang kiểm tra token...');
if (!TOKEN || TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ LỖI: Token chưa được set hoặc vẫn là giá trị mặc định!');
    console.error('👉 Hãy set biến DISCORD_TOKEN trong Environment Variables trên Render');
    process.exit(1);
}

if (TOKEN.length < 50) {
    console.error('❌ LỖI: Token quá ngắn! Có thể bị copy thiếu.');
    console.error(`📏 Độ dài token hiện tại: ${TOKEN.length} ký tự`);
    process.exit(1);
}

console.log(`✅ Token hợp lệ! Độ dài: ${TOKEN.length} ký tự`);
console.log('🚀 Đang đăng nhập bot...');

client.login(TOKEN).catch(err => {
    console.error('❌ Lỗi đăng nhập:', err);
});
