import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys"
import Pino from "pino"

const BOT_NAME = "WIXG STORE"

// 🔑 MULTI OWNER (ISI NOMOR KAMU)
const OWNERS = [
  "6283185660745@s.whatsapp.net"
]

const DELAY_PUSH = 2500
const DELAY_JPM = 3000
const MAX_PUSH = 50
const MAX_JPM = 15

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: [BOT_NAME, "Chrome", "1.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        startBot()
      }
    } else if (connection === "open") {
      console.log("✅ WIXG STORE BOT AKTIF")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    const isOwner = OWNERS.includes(sender)

    if (text === ".menu") {
      return sock.sendMessage(from, {
        text: `🤖 *${BOT_NAME}*

Owner Commands:
.pushkontak <pesan>
.jpm <pesan>

🛡️ Anti Banned: ON`
      })
    }

    if (!isOwner && (text.startsWith(".pushkontak") || text.startsWith(".jpm"))) {
      return sock.sendMessage(from, {
        text: "❌ Command khusus OWNER"
      })
    }

    if (text.startsWith(".pushkontak")) {
      if (!from.endsWith("@g.us")) {
        return sock.sendMessage(from, { text: "❌ Gunakan di grup" })
      }

      const pesan = text.replace(".pushkontak", "").trim()
      if (!pesan) return

      const group = await sock.groupMetadata(from)
      const members = group.participants.slice(0, MAX_PUSH)

      let sukses = 0
      for (let m of members) {
        if (m.id.includes("@s.whatsapp.net")) {
          await sock.sendMessage(m.id, { text: pesan })
          sukses++
          await sleep(DELAY_PUSH)
        }
      }

      sock.sendMessage(from, {
        text: `✅ Push Kontak Selesai\nTerkirim: ${sukses}`
      })
    }

    if (text.startsWith(".jpm")) {
      const pesan = text.replace(".jpm", "").trim()
      if (!pesan) return

      const groups = await sock.groupFetchAllParticipating()
      const ids = Object.keys(groups).slice(0, MAX_JPM)

      let sukses = 0
      for (let id of ids) {
        await sock.sendMessage(id, { text: pesan })
        sukses++
        await sleep(DELAY_JPM)
      }

      sock.sendMessage(from, {
        text: `✅ JPM Selesai\nGrup terkirim: ${sukses}`
      })
    }
  })
}

startBot()
