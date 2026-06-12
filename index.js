require('dotenv').config(); // Sửa chữ r viết thường
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const http = require('http');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Cấu hình lệnh Slash Command
const commands = [
    new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass Key Delta (Plato Relay) tốc độ cao không lỗi')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Dán link auth.platorelay.com lấy từ Delta vào đây')
                .setRequired(true)
        )
].map(command => command.toJSON());

// Thuật toán giải mã link
async function executeBypass(targetUrl) {
    const apiPool = [
        `https://api.bypass.vip/bypass?url=${encodeURIComponent(targetUrl)}`,
        `https://bypass.hd4y.net/api/bypass?url=${encodeURIComponent(targetUrl)}`
    ];

    let lastError = '';
    for (const url of apiPool) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                },
                timeout: 12000
            });

            const data = response.data;
            if (data.success || data.status === "success" || data.destination) {
                let resultKey = data.destination || data.result || data.bypassed_url;

                if (resultKey.includes("lootlabs") || resultKey.includes("linkvertise") || resultKey.includes("platorelay")) {
                    const secondaryRes = await axios.get(`https://api.bypass.vip/bypass?url=${encodeURIComponent(resultKey)}`, {
                        timeout: 10000
                    });
                    if (secondaryRes.data.success || secondaryRes.data.destination) {
                        resultKey = secondaryRes.data.destination || secondaryRes.data.result;
                    }
                }
                return { success: true, key: resultKey };
            }
        } catch (err) {
            lastError = err.message;
        }
    }
    return { success: false, error: lastError || "Tất cả các cổng API giải mã hiện tại đều bị quá tải." };
}

// Xử lý khi nhận lệnh từ Discord
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bypass') {
        const urlInput = interaction.options.getString('url').trim();

        if (!urlInput.includes('auth.platorelay.com')) {
            return interaction.reply({ content: '❌ Đây không phải là liên kết lấy Key của Plato Relay/Delta!', ephemeral: true });
        }

        await interaction.deferReply();

        const embedLoading = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('⚡ ĐANG TRÍCH XUẤT KEY THẬT...')
            .setDescription('Hệ thống đang chạy thuật toán giải mã chuỗi token mã hóa ngầm...');
        await interaction.editReply({ embeds: [embedLoading] });

        const bypassStatus = await executeBypass(urlInput);

        if (bypassStatus.success) {
            const embedSuccess = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎉 BYPASS KEY THÀNH CÔNG!')
                .setDescription(`Ông lấy đoạn mã này dán vào Delta:\n\`\`\`text\n${bypassStatus.key}\n\`\`\``)
                .setFooter({ text: 'Vexz Hub - Code bởi Quoc Hoa' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embedSuccess] });
        } else {
            const embedError = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ XỬ LÝ THẤT BẠI')
                .setDescription(`**Lý do lỗi:** \`${bypassStatus.error}\``);
            await interaction.editReply({ embeds: [embedError] });
        }
    }
});

// Sự kiện khi bot online và ép đồng bộ lệnh
client.once('ready', async () => {
    console.log(`[ONLINE] Bot Vexz Hub đã hoạt động dưới tên: ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('[SYSTEM] Đang tiến hành ép đồng bộ lệnh lên toàn bộ Server...');
        
        // Đăng ký trực tiếp vào tất cả các Server bot đang tham gia để hiện lệnh ngay lập tức
        client.guilds.cache.forEach(async (guild) => {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, guild.id),
                { body: commands }
            );
        });

        console.log('[SYSTEM] Đồng bộ thành công! Kiểm tra Discord xem có lệnh chưa ông.');
    } catch (error) {
        console.error('[ERROR] Lỗi đăng ký lệnh:', error);
    }
});

// Giữ Uptime Server
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('Vexz Hub Bot đang chạy online 24/7!');
    res.end();
}).listen(PORT, () => {
    console.log(`[UPTIME SERVER] Đã mở cổng thành công tại PORT: ${PORT}`);
});

client.login(TOKEN);
