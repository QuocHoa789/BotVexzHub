require('dotenv').config(); // Hỗ trợ đọc file cấu hình nếu test ở máy
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Nạp thông tin cấu hình từ biến môi trường (Environment Variables trên Render)
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Khởi tạo thực thể Bot Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. ĐĂNG KÝ HỆ THỐNG LỆNH INTERACTION (SLASH COMMAND)
const commands = [
    new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass siêu tốc link lấy Key Delta/Plato')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Dán link auth.platorelay.com lấy từ game vào đây')
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('[SYSTEM] Đang tiến hành đồng bộ lệnh /bypass lên máy chủ Discord...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('[SYSTEM] Đồng bộ thành công! Lệnh đã sẵn sàng sử dụng.');
    } catch (error) {
        console.error('[LỖI ĐĂNG KÝ LỆNH]', error);
    }
})();

// 2. THUẬT TOÁN KHỬ MÃ HÓA TOKEN ĐA TẦNG (DECODER LOGIC)
async function requestBypassGate(targetUrl) {
    // Danh sách các cổng API phân giải chuyên dụng để luân chuyển khi dính lỗi
    const apiPool = [
        `https://api.bypass.vip/bypass?url=${encodeURIComponent(targetUrl)}`,
        `https://bypass.hd4y.net/api/bypass?url=${encodeURIComponent(targetUrl)}`
    ];

    let fallbackError = '';

    for (const apiGate of apiPool) {
        try {
            console.log(`[CONNECT] Đang gửi yêu cầu giải mã đến server: ${new URL(apiGate).hostname}`);
            
            const response = await axios.get(apiGate, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                timeout: 12000 // Giới hạn 12 giây phản hồi để tránh treo luồng
            });

            const data = response.data;

            // Kiểm tra tính hợp lệ của cấu trúc JSON trả về từ các API Endpoint
            if (data.success || data.status === "success" || data.destination) {
                let cleanKey = data.destination || data.result || data.bypassed_url;

                // Nếu kết quả trả về vẫn là một link quảng cáo chặn tầng 2, tiến hành bóc tiếp
                if (cleanKey.includes("lootlabs") || cleanKey.includes("linkvertise") || cleanKey.includes("platorelay")) {
                    console.log("[CONNECT] Phát hiện liên kết bọc tầng 2, đang gửi request đệ quy...");
                    const secondaryResponse = await axios.get(`https://api.bypass.vip/bypass?url=${encodeURIComponent(cleanKey)}`, {
                        timeout: 10000
                    });
                    if (secondaryResponse.data.success || secondaryResponse.data.destination) {
                        cleanKey = secondaryResponse.data.destination || secondaryResponse.data.result;
                    }
                }

                return { success: true, key: cleanKey, node: new URL(apiGate).hostname };
            }
        } catch (err) {
            fallbackError = err.message;
            console.log(`[WARN] Cổng ${new URL(apiGate).hostname} phản hồi chậm hoặc lỗi IP. Đang chuyển sang cổng phụ...`);
        }
    }

    return { success: false, error: fallbackError || "Hệ thống Token đã hết hạn vạch định thời gian (TTL) hoặc tất cả API bị quá tải." };
}

// 3. TIẾP NHẬN SỰ KIỆN VÀ PHẢN HỒI LỆNH (EVENT LISTENER)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bypass') {
        const rawUrl = interaction.options.getString('url').trim();

        // Bộ lọc điều kiện đầu vào để tránh lãng phí tài nguyên gửi request bừa bãi
        if (!rawUrl.includes('auth.platorelay.com')) {
            return interaction.reply({ content: '❌ Định dạng đường dẫn không hợp lệ! Vui lòng nhập đúng link Plato Relay lấy từ game.', ephemeral: true });
        }

        // Ép hoãn thời gian phản hồi (Defer) để không bị lỗi Timeout 3 giây của Discord
        await interaction.deferReply();

        // Tạo khung Embed trạng thái xử lý
        const embedWaiting = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle('⚡ ĐANG KHỞI CHẠY TIẾN TRÌNH...')
            .setDescription('Hệ thống đang thực hiện bóc tách token mã hóa trực tiếp thông qua API Server. Vui lòng giữ kết nối...');
        
        await interaction.editReply({ embeds: [embedWaiting] });

        // Gọi hàm thực thi giải mã
        const processStatus = await requestByp
