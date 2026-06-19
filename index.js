// bot.js - Discord Bot tích hợp Obfuscator Lua (lệnh .obf v1) - ĐÃ FIX LỖI
const fs = require('fs');
const { Client, Intents } = require('discord.js');
const luaparse = require('luaparse');

// ========== BẮT LỖI TOÀN CỤC ĐỂ TRÁNH CRASH ==========
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason));

// ========== OBFUSCATOR LOGIC ==========
let KEY_TABLE = Array.from({length:256}, () => Math.floor(Math.random()*256));
let STRING_POOL = [];

function customEncrypt(plain) {
    const bytes = Buffer.from(plain, 'utf8');
    const enc = [];
    for (let i = 0; i < bytes.length; i++) {
        const k = KEY_TABLE[(i + bytes.length) % KEY_TABLE.length];
        let val = (bytes[i] ^ k) + (i % 256);
        val = val % 256;
        enc.push(val.toString(16).padStart(2,'0'));
    }
    return enc.join('');
}

const OP = {
    PUSH:0, ADD:1, SUB:2, MUL:3, DIV:4, MOD:5,
    EQ:6, LT:7, LE:8, JMP:9, JZ:10, JNZ:11,
    CALL:12, RET:13, HALT:14, LOAD:15, STORE:16,
    DECSTR:17, CONCAT:18, NOT:19, NOP:20
};

function addString(plain) {
    const enc = customEncrypt(plain);
    STRING_POOL.push(enc);
    return STRING_POOL.length - 1;
}

function generateAntiTamper() {
    return `
-- RandomStrings
local RandomStrings = { randomString = function() local t={} for i=1,10 do t[i]=string.char(math.random(65,90)) end return table.concat(t) end }
-- Anti Tamper
local valid = true
local err1,err2,err3 = function() error("Tamper1") end, function() error("Tamper2") end, function() error("Tamper3") end
local errFuncs = {err1,err2,err3}
local err = errFuncs[math.random(1, #errFuncs)]
local _E=error local _P=pairs local _S=setmetatable local _G=getmetatable local _T=type local _L=load
local _PC=pcall local _MR=math.random local _X=xpcall local _CO=coroutine local _Str=string local _M=math local _Tab=table
local gmatch = string.gmatch
local status, pcallErr = pcall(function() end)
local pcallIntact2 = false
local pcallIntact = _PC(function() pcallIntact2 = true end) and pcallIntact2
local random = math.random
local unpkg = table.unpack or unpack
local n = _MR(3, 65)
if n < 3 or n > 65 then
    local a = random(1, 2^24) - RandomStrings.randomString() ^ random(1, 2^24)
    return RandomStrings.randomString() / a
end
local acc1, acc2 = 0, 0
local pcallRet = {pcall(function() local a = random(1, 2^24) - RandomStrings.randomString() ^ random(1, 2^24) return RandomStrings.randomString() / a end)}
local origMsg = pcallRet[2]
local line = tonumber(gmatch(tostring(origMsg), ':(%d*):')())
for i = 1, 100 do
    local len = 100
    local n2 = i % 256
    local pos = i % len + 1
    local shouldErr = i % 2 == 0
    local msg = origMsg:gsub(':(%d*):', ':' .. tostring(random(0, 10000)) .. ':')
    local arr = {pcall(function()
        if random(1, 2) == 1 or i == n then
            local line2 = tonumber(gmatch(tostring(({pcall(function() local a = random(1, 2^24) - RandomStrings.randomString() ^ random(1, 2^24) return RandomStrings.randomString() / a end)})[2]), ':(%d*):')())
            valid = valid and line == line2
        end
        if shouldErr then error(msg, 0) end
        local arr = {}
        for i = 1, len do arr[i] = random(0, 255) end
        arr[pos] = n2
        return unpkg(arr)
    end)}
    if shouldErr then valid = valid and arr[1] == false and arr[2] == msg
    else valid = valid and arr[1]; acc1 = (acc1 + arr[pos + 1]) % 256; acc2 = (acc2 + n2) % 256 end
end
valid = valid and acc1 == acc2
if valid then else repeat return (function() err() end)() until true end
`;
}

function generateRuntime(pool) {
    const keyTable = JSON.stringify(KEY_TABLE);
    const poolStr = JSON.stringify(pool);
    const antiTamper = generateAntiTamper();
    // FIX: tạo một hàm ẩn danh và trả về VM thay vì return thẳng
    return `
local _KEY = ${keyTable}
local function _d(enc)
    local r = {}
    for i=1,#enc/2 do
        local b = tonumber(enc:sub(i*2-1,i*2),16)
        local k = _KEY[(i-1 + #enc/2) % #_KEY + 1]
        local v = (b - ((i-1)%256)) % 256
        v = bit32 and bit32.bxor(v,k) or (v ~ k)
        r[i] = string.char(v)
    end
    return table.concat(r)
end
local _S = ${poolStr}
local _C = setmetatable({}, { __index = function(_,i) return _d(_S[i]) end, __call = function(_,i) return _d(_S[i]) end })
${antiTamper}
local _M, _ST, _IP, _bc, _STATE = {}, {}, 1, nil, 0
local function _run()
    while _STATE ~= 999 do
        if _STATE == 0 then
            local op = _bc[_IP]
            if op==0 then _STATE=10 elseif op==1 then _STATE=20 elseif op==2 then _STATE=30 elseif op==3 then _STATE=40 elseif op==4 then _STATE=50 elseif op==5 then _STATE=60 elseif op==6 then _STATE=70 elseif op==7 then _STATE=80 elseif op==8 then _STATE=90 elseif op==9 then _STATE=100 elseif op==10 then _STATE=110 elseif op==11 then _STATE=120 elseif op==12 then _STATE=130 elseif op==13 then _STATE=140 elseif op==14 then _STATE=999 elseif op==15 then _STATE=150 elseif op==16 then _STATE=160 elseif op==17 then _STATE=170 elseif op==18 then _STATE=180 elseif op==19 then _STATE=190 else _STATE=0 end
        elseif _STATE==10 then _IP=_IP+1 table.insert(_ST,_bc[_IP]) _STATE=0
        elseif _STATE==20 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a+b) _STATE=0 _IP=_IP+1
        elseif _STATE==30 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a-b) _STATE=0 _IP=_IP+1
        elseif _STATE==40 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a*b) _STATE=0 _IP=_IP+1
        elseif _STATE==50 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a/b) _STATE=0 _IP=_IP+1
        elseif _STATE==60 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a%b) _STATE=0 _IP=_IP+1
        elseif _STATE==70 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a==b and 1 or 0) _STATE=0 _IP=_IP+1
        elseif _STATE==80 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a<b and 1 or 0) _STATE=0 _IP=_IP+1
        elseif _STATE==90 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a<=b and 1 or 0) _STATE=0 _IP=_IP+1
        elseif _STATE==100 then _IP=_bc[_IP+1] _STATE=0
        elseif _STATE==110 then if table.remove(_ST)==0 then _IP=_bc[_IP+1] else _IP=_IP+2 end _STATE=0
        elseif _STATE==120 then if table.remove(_ST)~=0 then _IP=_bc[_IP+1] else _IP=_IP+2 end _STATE=0
        elseif _STATE==130 then local fid=_bc[_IP+1] local nargs=_bc[_IP+2] local args={} for i=1,nargs do table.insert(args,1,table.remove(_ST)) end local ret=_G["_EXTERNAL"][fid](table.unpack(args)) table.insert(_ST,ret) _IP=_IP+3 _STATE=0
        elseif _STATE==140 then _IP=table.remove(_ST) _STATE=0
        elseif _STATE==150 then local v=_bc[_IP+1] table.insert(_ST,_M[v]) _IP=_IP+2 _STATE=0
        elseif _STATE==160 then local v=_bc[_IP+1] _M[v]=table.remove(_ST) _IP=_IP+2 _STATE=0
        elseif _STATE==170 then local idx=_bc[_IP+1] table.insert(_ST,_C[idx]) _IP=_IP+2 _STATE=0
        elseif _STATE==180 then local b=table.remove(_ST) local a=table.remove(_ST) table.insert(_ST,a..b) _STATE=0 _IP=_IP+1
        elseif _STATE==190 then local v=table.remove(_ST) table.insert(_ST,not v and 1 or 0) _STATE=0 _IP=_IP+1
        end
    end
end
return {run = function(bc) _bc=bc; _STATE=0; _IP=1; _run() end}
`;
}

function compileAST(ast) {
    let bytecode = [];
    let varMap = new Map();
    let varCount = 0;
    function emit(op, ...) { bytecode.push(op); for(let v of arguments) bytecode.push(v); }
    function getVar(name) { if(!varMap.has(name)) varMap.set(name, ++varCount); return varMap.get(name); }
    function expr(node) {
        if (!node) return;
        switch(node.type) {
            case 'NumericLiteral': emit(OP.PUSH, node.value); break;
            case 'StringLiteral': emit(OP.DECSTR, addString(node.value)); break;
            case 'Identifier': emit(OP.LOAD, getVar(node.name)); break;
            case 'BinaryExpression':
                expr(node.left); expr(node.right);
                const ops = {'+':OP.ADD, '-':OP.SUB, '*':OP.MUL, '/':OP.DIV, '%':OP.MOD, '==':OP.EQ, '<':OP.LT, '<=':OP.LE, '..':OP.CONCAT};
                if (ops[node.operator]) bytecode.push(ops[node.operator]);
                break;
            case 'CallExpression':
                for(let i = node.arguments.length-1; i>=0; i--) expr(node.arguments[i]);
                let fid = 0;
                if (node.base.type === 'Identifier' && node.base.name === 'print') fid = 0;
                emit(OP.CALL, fid, node.arguments.length);
                break;
            default: break;
        }
    }
    function stmt(node) {
        if (!node) return;
        switch(node.type) {
            case 'AssignmentStatement':
                const v = node.variables[0].name;
                expr(node.init[0]);
                emit(OP.STORE, getVar(v));
                break;
            case 'FunctionCall': expr(node); break;
            case 'IfStatement':
                expr(node.clauses[0].condition);
                const jzIdx = bytecode.length;
                emit(OP.JZ, 0);
                node.clauses[0].body.forEach(stmt);
                const jmpIdx = bytecode.length;
                emit(OP.JMP, 0);
                bytecode[jzIdx+1] = bytecode.length;
                if (node.clauses[0].elseBody) node.clauses[0].elseBody.forEach(stmt);
                bytecode[jmpIdx+1] = bytecode.length;
                break;
            default: break;
        }
    }
    ast.body.forEach(s => stmt(s));
    bytecode.push(OP.HALT);
    return bytecode;
}

function obfuscateCode(luaCode) {
    KEY_TABLE = Array.from({length:256}, () => Math.floor(Math.random()*256));
    STRING_POOL = [];
    const ast = luaparse.parse(luaCode, {luaVersion:'5.1'});
    const bc = compileAST(ast);

    const chunks = [];
    for(let i = 0; i < bc.length; i += 8) {
        chunks.push(customEncrypt(JSON.stringify(bc.slice(i, i+8))));
    }

    const runtime = generateRuntime(STRING_POOL);
    const finalCode = `--[[ Obfuscated Bot ]]
local VM = (function()
${runtime}
end)()
_G["_EXTERNAL"] = { [0] = print }
local _chunks = ${JSON.stringify(chunks)}
local _bc = {}
for i=1,#_chunks do
    local plain = _d(_chunks[i])
    local arr = loadstring("return "..plain)()
    for _,v in ipairs(arr) do table.insert(_bc, v) end
end
VM.run(_bc)
`;
    return finalCode;
}

// ========== DISCORD BOT ==========
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES
    ]
});

// Xử lý lỗi client để không bị crash
client.on('error', (err) => console.error('[CLIENT ERROR]', err));
client.on('shardError', (err) => console.error('[SHARD ERROR]', err));

client.once('ready', () => {
    console.log(`Bot đã online: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('.obf v1')) {
        let code = message.content.slice('.obf v1'.length).trim();
        const codeBlockMatch = code.match(/```(?:lua)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            code = codeBlockMatch[1];
        } else {
            const attachment = message.attachments.first();
            if (attachment && attachment.name.endsWith('.lua')) {
                try {
                    const fetch = (await import('node-fetch')).default || require('node-fetch');
                    const response = await fetch(attachment.url);
                    code = await response.text();
                } catch (e) {
                    return message.reply('❌ Không thể đọc file đính kèm. Lỗi: ' + e.message);
                }
            }
        }
        if (!code) return message.reply('❌ Vui lòng gửi code Lua sau lệnh `.obf v1` (có thể bọc trong \\`\\`\\`lua ... \\`\\`\\`) hoặc đính kèm file .lua.');

        try {
            const obfuscated = obfuscateCode(code);
            const buffer = Buffer.from(obfuscated, 'utf8');
            // Tự động phát hiện phiên bản Discord.js để dùng đúng class
            let attachment;
            if (typeof MessageAttachment !== 'undefined') {
                // Discord.js v13
                attachment = new MessageAttachment(buffer, 'obfuscated.lua');
            } else if (typeof require('discord.js').AttachmentBuilder !== 'undefined') {
                // Discord.js v14
                const { AttachmentBuilder } = require('discord.js');
                attachment = new AttachmentBuilder(buffer, { name: 'obfuscated.lua' });
            } else {
                // Fallback: gửi dạng text nếu không xác định được
                if (obfuscated.length <= 1900) {
                    return message.reply(`✅ Code đã obfuscate:\n\`\`\`lua\n${obfuscated}\n\`\`\``);
                } else {
                    return message.reply('❌ Code quá dài và không thể gửi file do chưa hỗ trợ phiên bản Discord.js này. Hãy kiểm tra lại.');
                }
            }
            return message.reply({ files: [attachment], content: '✅ Code đã được obfuscate (xem file đính kèm).' });
        } catch (err) {
            console.error(err);
            return message.reply(`❌ Lỗi khi obfuscate: ${err.message}`);
        }
    }
});

// Lấy token – NẾU CHƯA CÓ SẼ BÁO LỖI RÕ RÀNG, KHÔNG CRASH
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN || TOKEN === 'YOUR_BOT_TOKEN') {
    console.error('❌ Token Discord chưa được đặt. Vui lòng thay YOUR_BOT_TOKEN hoặc set biến môi trường DISCORD_TOKEN.');
    process.exit(1);
}
client.login(TOKEN).catch(err => {
    console.error('❌ Không thể đăng nhập Discord. Kiểm tra token:', err.message);
    process.exit(1);
});
